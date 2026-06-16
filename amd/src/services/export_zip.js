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

/**
 * ZIP export service for the Process Feedback UI.
 *
 * @module     local_processfeedback/services/export_zip
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {createPayload} from 'local_processfeedback/services/payload';
import {buildZipBlob, getProcessZipFilename} from 'local_processfeedback/services/zip_builder';
import {getString} from 'local_processfeedback/state/store';
import {sendZipBlobToProcessFeedback} from 'local_processfeedback/submission/report_transfer';
import {debugError, debugLog} from 'local_processfeedback/utils/logger';

const downloadBlob = (windowRef, documentRef, blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = url;
    link.download = filename;
    documentRef.body.appendChild(link);
    link.click();
    link.remove();
    windowRef.setTimeout(() => URL.revokeObjectURL(url), 1000);
    debugLog(windowRef, 'ZIP download triggered', {
        filename,
        size: blob.size,
    });
};

const getZipReadme = (state) => [
    getString(state, 'zipReadmeGenerated'),
    getString(state, 'zipReadmeData'),
    getString(state, 'zipReadmePolicy'),
].join('\n');

const progressStart = async(progress, stepId, message = '') => {
    if (progress && typeof progress.start === 'function') {
        await progress.start(stepId, message);
    } else if (progress) {
        progress.textContent = message;
    }
};

const progressComplete = (progress, stepId, message = '') => {
    if (progress && typeof progress.complete === 'function') {
        return progress.complete(stepId, message);
    }
    return Promise.resolve();
};

const progressError = (progress, stepId, message = '') => {
    if (progress && typeof progress.error === 'function') {
        progress.error(stepId, message);
    } else if (progress) {
        progress.textContent = message;
    }
};

const throwIfCancelled = (progress) => {
    if (progress && typeof progress.throwIfCancelled === 'function') {
        progress.throwIfCancelled();
    }
};

export const createZipExportService = (state, revisionStore, autosaveService, panel, windowRef, documentRef) => {
    const createZipPackage = async(exportDetails = {}, progress = null) => {
        debugLog(windowRef, 'ZIP package creation started', {
            exportDetailsProvided: Boolean(exportDetails && Object.keys(exportDetails).length),
        });
        throwIfCancelled(progress);
        await progressStart(progress, 'capture', getString(state, 'exportStepCaptureDetail'));
        await autosaveService.captureRevision();
        throwIfCancelled(progress);
        await progressComplete(progress, 'capture');

        await progressStart(progress, 'paste', getString(state, 'exportStepPasteDetail'));
        if (autosaveService && typeof autosaveService.flushPendingPasteActions === 'function') {
            await autosaveService.flushPendingPasteActions();
        }
        throwIfCancelled(progress);
        await progressComplete(progress, 'paste');

        await progressStart(progress, 'count', getString(state, 'exportStepCountDetail'));
        const count = await autosaveService.refreshCount();
        throwIfCancelled(progress);
        debugLog(windowRef, 'ZIP package revision count checked', {
            revisionCount: count,
        });

        if (count === 0) {
            debugLog(windowRef, 'ZIP package creation stopped: no revisions available');
            progressError(progress, 'count', getString(state, 'downloadEmpty'));
            panel.setStatus(
                getString(state, 'downloadEmpty'),
                'text-warning'
            );
            return null;
        }
        await progressComplete(progress, 'count');

        const payload = await createPayload(state, revisionStore, exportDetails, progress);
        throwIfCancelled(progress);

        await progressStart(progress, 'zip', getString(state, 'exportStepZipDetail'));
        const blob = await buildZipBlob(payload, getZipReadme(state));
        throwIfCancelled(progress);
        const filename = getProcessZipFilename(state, exportDetails);
        await progressComplete(progress, 'zip');
        debugLog(windowRef, 'ZIP package created', {
            filename,
            size: blob.size,
        });
        return {
            blob,
            filename,
        };
    };

    const downloadZip = async(exportDetails = {}, progress = null) => {
        debugLog(windowRef, 'ZIP download requested');
        const zipPackage = await createZipPackage(exportDetails, progress);
        if (!zipPackage) {
            return false;
        }

        const {blob, filename} = zipPackage;
        await progressStart(progress, 'download', getString(state, 'exportStepDownloadDetail'));
        throwIfCancelled(progress);
        downloadBlob(windowRef, documentRef, blob, filename);
        await progressComplete(progress, 'download');
        panel.setStatus(getString(state, 'downloadReady'), 'text-success');
        debugLog(windowRef, 'ZIP download completed', {
            filename,
        });
        return true;
    };

    const openReport = async(exportDetails = {}, status = null) => {
        debugLog(windowRef, 'Open report requested');
        await progressStart(status, 'openreport', getString(state, 'exportStepOpenReportDetail'));
        const targetWindow = windowRef.open('', '_blank');
        if (!targetWindow) {
            const errorMessage = getString(state, 'exportErrorPopupBlocked');
            progressError(status, 'openreport', errorMessage);
            debugError(windowRef, 'Open report failed: popup blocked');
            throw new Error(errorMessage);
        }
        let unregisterCancel = null;
        if (status && typeof status.onCancel === 'function') {
            unregisterCancel = status.onCancel(() => {
                try {
                    targetWindow.close();
                } catch (error) {
                    // Ignore browser restrictions while cancelling a best-effort helper tab.
                }
            });
        }
        await progressComplete(status, 'openreport');

        try {
            const zipPackage = await createZipPackage(exportDetails, status);
            if (!zipPackage) {
                targetWindow.close();
                debugLog(windowRef, 'Open report stopped: no ZIP package created');
                return false;
            }

            const {blob, filename} = zipPackage;
            throwIfCancelled(status);
            await sendZipBlobToProcessFeedback(blob, {
                assignmentId: Number(state.params.assignmentInstanceId || state.params.activityInstanceId || 0),
                submissionId: 0,
                studentId: Number(state.params.userId || 0),
                filename,
                url: windowRef.location.href,
            }, status || panel, windowRef, {
                isMoodleSingle: 'true',
            }, targetWindow);
            await progressComplete(status, 'transfer');
            panel.setStatus(getString(state, 'exportReportReady'), 'text-success');
            debugLog(windowRef, 'Report opened in ProcessFeedback', {
                filename,
                size: blob.size,
            });
            return true;
        } finally {
            if (unregisterCancel) {
                unregisterCancel();
            }
        }
    };

    return {
        downloadZip,
        openReport,
    };
};
