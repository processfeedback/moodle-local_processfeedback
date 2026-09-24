// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

import Str from 'core/str';
import {debugLog} from 'local_processfeedback/utils/logger';

export const ZIP_LINK_SELECTOR = 'a[data-processfeedback-zip="true"]';
export const DASHBOARD_TOOLBAR_CLASS = 'local-processfeedback-dashboard-report-action';
export const SINGLE_REPORT_ACTION_CLASS = 'local-processfeedback-single-report-action';
export const SINGLE_REPORT_STATUS_CLASS = 'local-processfeedback-single-report-status';
export const SINGLE_REPORT_BUTTON_CLASS = 'local-processfeedback-single-report-button';

const SUBMISSION_TABLE_CLASS = 'local-processfeedback-submission-table';
const SUBMISSION_CELL_CLASS = 'local-processfeedback-submission-cell';
const PROCESSFEEDBACK_BUTTON_CLASS = 'btn btn-secondary';
const EXPLORER_URL = 'https://app.processfeedback.org/exploreprocess';
const EXPLORER_ORIGIN = 'https://app.processfeedback.org';
const READY_TIMEOUT_MS = 60000;
const ZIP_TRANSFER_CHUNK_SIZE = 5;

const getLanguageString = (key, value = undefined) => Str.get_string(key, 'local_processfeedback', value);

const getDashboardOpenedMessage = (count) => getLanguageString(
    count === 1 ? 'reportdashboardopenedone' : 'reportdashboardopenedmany',
    count
);

const getFilenameFromContentDisposition = (contentDisposition = '') => {
    const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch && encodedMatch[1]) {
        try {
            return decodeURIComponent(encodedMatch[1].replace(/"/g, '').trim());
        } catch (error) {
            return encodedMatch[1].replace(/"/g, '').trim();
        }
    }

    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    return match && match[1] ? match[1].trim() : '';
};

const getFilenameFromLinkText = (link) => {
    const text = (link.textContent || '').trim();
    const match = text.match(/[^\s/\\]+\.zip\b/i);
    return match && match[0] ? match[0] : '';
};

const getFilenameFromUrl = (url) => {
    const filename = url.pathname.split('/').pop() || '';
    return filename.toLowerCase().indexOf('.zip') !== -1 ? filename : '';
};

export const getProcessFeedbackZipLinks = (documentRef) => {
    const seen = new Set();
    return Array.from(documentRef.querySelectorAll(ZIP_LINK_SELECTOR)).filter((link) => {
        const href = link.getAttribute('href') || '';
        const key = `${link.dataset.submissionId || ''}:${href}`;
        if (!href || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

export const createProcessFeedbackButton = (documentRef, label, extraClass = '') => {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = `${PROCESSFEEDBACK_BUTTON_CLASS}${extraClass ? ` ${extraClass}` : ''}`;
    button.append(documentRef.createTextNode(label));
    return button;
};

export const markProcessFeedbackSubmissionTables = (links) => {
    links.forEach((link) => {
        const table = link.closest('.generaltable, table, .submissionstatustable');
        if (table) {
            table.classList.add(SUBMISSION_TABLE_CLASS);
        }

        const cell = link.closest('td, th');
        if (cell) {
            cell.classList.add(SUBMISSION_CELL_CLASS);
        }
    });
    debugLog(null, 'Process Feedback submission tables marked', {
        linkCount: links.length,
    });
};

export const createProcessFeedbackSubmissionMessage = (submission, batchId, chunkIndex = 0, totalChunks = 1) => ({
    type: 'SUBMISSION_BATCH',
    batchId,
    chunkIndex,
    totalChunks,
    isFinalChunk: chunkIndex === totalChunks - 1,
    submissions: [submission],
});

const collectProcessFeedbackSubmission = async (link, windowRef) => {
    debugLog(windowRef, 'Collecting Process Feedback ZIP submission', {
        filename: link.dataset.filename || '',
        submissionId: link.dataset.submissionId || '',
        hasHref: Boolean(link.href),
    });
    const response = await windowRef.fetch(link.href, { credentials: 'same-origin' });
    if (!response.ok) {
        throw new Error(`Could not read ${link.dataset.filename || link.href}: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const url = new URL(link.href, windowRef.location.href);
    const filename = link.dataset.filename ||
        getFilenameFromContentDisposition(response.headers.get('content-disposition') || '') ||
        getFilenameFromLinkText(link) ||
        getFilenameFromUrl(url) ||
        'processfeedback.zip';

    return {
        buffer,
        metadata: {
            assignmentId: Number(link.dataset.assignmentId || 0),
            submissionId: Number(link.dataset.submissionId || 0),
            studentId: Number(link.dataset.userid || 0),
            filename,
            url: url.href,
        },
    };
};

const createAbortError = () => {
    const error = new Error('ProcessFeedback transfer cancelled.');
    error.name = 'AbortError';
    return error;
};

const waitForExplorerReady = (targetWindow, windowRef, status = null) => new Promise((resolve, reject) => {
    let isReady = false;
    let unregisterCancel = null;
    const removeListener = () => {
        windowRef.removeEventListener('message', onMessage);
        if (unregisterCancel) {
            unregisterCancel();
            unregisterCancel = null;
        }
    };
    const timeout = windowRef.setTimeout(() => {
        removeListener();
        debugLog(windowRef, 'ProcessFeedback ready wait timed out');
        reject(new Error('ProcessFeedback did not become ready in time.'));
    }, READY_TIMEOUT_MS);
    const cancel = () => {
        windowRef.clearTimeout(timeout);
        removeListener();
        debugLog(windowRef, 'ProcessFeedback ready wait cancelled');
        reject(createAbortError());
    };

    if (status && typeof status.onCancel === 'function') {
        unregisterCancel = status.onCancel(cancel);
    }

    function onMessage(event) {
        if (isReady) {
            return;
        }
        if (event.origin !== EXPLORER_ORIGIN || event.source !== targetWindow) {
            return;
        }
        if (!event.data || event.data.type !== 'READY') {
            return;
        }

        isReady = true;
        windowRef.clearTimeout(timeout);
        debugLog(windowRef, 'ProcessFeedback ready message received');
        resolve(removeListener);
    }

    windowRef.addEventListener('message', onMessage);
    debugLog(windowRef, 'Waiting for ProcessFeedback ready message', {
        timeoutMs: READY_TIMEOUT_MS,
    });
});

const sendSubmissionChunk = async (batchId, links, chunkIndex, totalChunks, targetWindow, windowRef) => {
    const submissions = [];
    const transfers = [];
    debugLog(windowRef, 'Preparing ProcessFeedback submission chunk', {
        batchId,
        chunkIndex,
        totalChunks,
        linkCount: links.length,
    });

    for (const link of links) {
        const submission = await collectProcessFeedbackSubmission(link, windowRef);
        submissions.push({
            ...submission.metadata,
            data: submission.buffer,
        });
        transfers.push(submission.buffer);
    }

    targetWindow.postMessage({
        type: 'SUBMISSION_BATCH',
        batchId,
        chunkIndex,
        totalChunks,
        isFinalChunk: chunkIndex === totalChunks - 1,
        submissions,
    }, EXPLORER_ORIGIN, transfers);
    debugLog(windowRef, 'ProcessFeedback submission chunk sent', {
        batchId,
        chunkIndex,
        submissionCount: submissions.length,
    });
};

const buildExplorerUrl = (params = {}) => {
    const url = new URL(EXPLORER_URL);
    Object.keys(params).forEach((key) => {
        url.searchParams.set(key, params[key]);
    });
    return url.href;
};

const startProgressStep = async(status, stepId, message) => {
    if (status && typeof status.throwIfCancelled === 'function') {
        status.throwIfCancelled();
    }
    if (status && typeof status.start === 'function') {
        await status.start(stepId, message);
    } else if (status) {
        status.textContent = message;
    }
};

const throwIfCancelled = (status) => {
    if (status && typeof status.throwIfCancelled === 'function') {
        status.throwIfCancelled();
    }
};

const setStatusText = (status, message) => {
    if (status && typeof status.message === 'function') {
        status.message(message);
    } else if (status) {
        status.textContent = message;
    }
};

export const sendZipLinksToProcessFeedback = async (
    links,
    button,
    status,
    windowRef,
    explorerParams = {},
    transferOptions = {}
) => {
    debugLog(windowRef, 'Sending ZIP links to ProcessFeedback', {
        linkCount: links.length,
        explorerParams,
    });
    const targetWindow = windowRef.open('', '_blank');
    if (!targetWindow) {
        throw new Error(await getLanguageString('reporterrorpopupblocked'));
    }

    status.textContent = await getLanguageString('reportwaiting');
    const readyPromise = waitForExplorerReady(targetWindow, windowRef);
    targetWindow.location.href = buildExplorerUrl(explorerParams);
    const removeReadyListener = await readyPromise;

    try {
        const batchId = `processfeedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const totalChunks = Math.ceil(links.length / ZIP_TRANSFER_CHUNK_SIZE);
        debugLog(windowRef, 'ProcessFeedback link batch started', {
            batchId,
            totalChunks,
        });

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * ZIP_TRANSFER_CHUNK_SIZE;
            const chunk = links.slice(start, start + ZIP_TRANSFER_CHUNK_SIZE);
            status.textContent = await getLanguageString('reportsendingrange', {
                start: start + 1,
                end: start + chunk.length,
                total: links.length,
            });
            await sendSubmissionChunk(batchId, chunk, chunkIndex, totalChunks, targetWindow, windowRef);
        }
    } finally {
        removeReadyListener();
    }

    status.textContent = transferOptions.successMessage ?
        await transferOptions.successMessage(links.length) :
        await getDashboardOpenedMessage(links.length);
    button.disabled = false;
    debugLog(windowRef, 'ZIP links sent', {
        linkCount: links.length,
    });
};

export const sendZipBlobToProcessFeedback = async(blob, metadata, status, windowRef, explorerParams = {}, existingTargetWindow = null) => {
    debugLog(windowRef, 'Sending ZIP blob', {
        filename: metadata && metadata.filename ? metadata.filename : '',
        size: blob.size,
        explorerParams,
        hasExistingTargetWindow: Boolean(existingTargetWindow),
    });
    const targetWindow = existingTargetWindow || windowRef.open('', '_blank');
    if (!targetWindow) {
        throw new Error(await getLanguageString('reporterrorpopupblocked'));
    }

    await startProgressStep(status, 'transfer', await getLanguageString('reportwaiting'));
    const readyPromise = waitForExplorerReady(targetWindow, windowRef, status);
    targetWindow.location.href = buildExplorerUrl(explorerParams);
    const removeReadyListener = await readyPromise;
    throwIfCancelled(status);

    try {
        const buffer = await blob.arrayBuffer();
        throwIfCancelled(status);
        const batchId = `processfeedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const submission = Object.assign({}, metadata, {
            data: buffer,
        });
        setStatusText(status, await getLanguageString('reportsendingone'));
        throwIfCancelled(status);
        targetWindow.postMessage(
            createProcessFeedbackSubmissionMessage(submission, batchId),
            EXPLORER_ORIGIN,
            [buffer]
        );
        debugLog(windowRef, 'ZIP blob posted to ProcessFeedback', {
            batchId,
            filename: metadata && metadata.filename ? metadata.filename : '',
        });
    } finally {
        removeReadyListener();
    }

    setStatusText(status, await getLanguageString('reportsingleopened'));
    debugLog(windowRef, 'ZIP blob sent to ProcessFeedback');
};
