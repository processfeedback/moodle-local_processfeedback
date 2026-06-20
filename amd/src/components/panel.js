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
 * Panel component for the Process Feedback UI.
 *
 * @module     local_processfeedback/components/panel
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { getActivityTitle, getString } from 'local_processfeedback/state/store';
import {debugError, debugLog, isDebugExportStepsEnabled} from 'local_processfeedback/utils/logger';

export const PANEL_CLASS = 'local-processfeedback-panel';

const COUNT_CLASS = 'local-processfeedback-count';
const MODAL_CLASS = 'local-processfeedback-export-modal';
const EXPLORE_PROCESS_URL = 'https://test.processfeedback.org/exploreprocess';
const DEBUG_EXPORT_STEP_DELAY_MS = 1000;
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getDownloadButtonTitle = (state) => [
    getString(state, 'downloadButtonTitleIntro'),
    getString(state, 'downloadButtonTitleAction'),
    getString(state, 'downloadButtonTitleRevision').replace('__COUNT__', String(state.lastRevisionCount)),
].join(' ');

const createButton = (documentRef, label, className) => {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = className;
    button.append(documentRef.createTextNode(label));
    return button;
};

const setElementHidden = (element, hidden) => {
    element.hidden = hidden;
    element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
};

const getExportDetails = (state) => ({
    taskName: getActivityTitle(state),
    author: state.params.userFullName,
    institute: state.params.siteName,
    email: state.params.userEmail,
});

const createSpinner = (documentRef) => {
    const spinner = documentRef.createElement('div');
    spinner.className = 'spinner-border text-secondary local-processfeedback-export-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-hidden', 'true');
    return spinner;
};

const waitForDebugStep = (windowRef) => {
    if (!isDebugExportStepsEnabled(windowRef)) {
        return Promise.resolve();
    }
    debugLog(windowRef, 'Export debug step delay', {
        delayMs: DEBUG_EXPORT_STEP_DELAY_MS,
    });
    return new Promise((resolve) => {
        windowRef.setTimeout(resolve, DEBUG_EXPORT_STEP_DELAY_MS);
    });
};

const createDetailsRow = (documentRef, labelText, valueText) => {
    const label = documentRef.createElement('dt');
    label.className = 'col-sm-4';
    label.textContent = labelText;

    const value = documentRef.createElement('dd');
    value.className = 'col-sm-8';
    value.textContent = valueText || '-';

    return [label, value];
};

const createDetailsView = (state, documentRef) => {
    const wrap = documentRef.createElement('div');


    const details = documentRef.createElement('dl');
    details.className = 'row local-processfeedback-export-details';
    [
        createDetailsRow(documentRef, getString(state, 'exportFieldTitle'), getActivityTitle(state)),
        createDetailsRow(documentRef, getString(state, 'exportFieldName'), state.params.userFullName),
        createDetailsRow(documentRef, getString(state, 'exportFieldInstitution'), state.params.siteName),
        createDetailsRow(documentRef, getString(state, 'exportFieldEmail'), state.params.userEmail),
    ].forEach((row) => details.append(...row));

    wrap.append(details);
    return wrap;
};

const createAbortError = () => {
    const error = new Error('Export cancelled because the modal was closed.');
    error.name = 'AbortError';
    return error;
};

const createProgressView = (state, documentRef, isCancelled) => {
    const windowRef = documentRef.defaultView || window;
    const fragment = documentRef.createDocumentFragment();
    const wrap = documentRef.createElement('div');
    wrap.className = 'local-processfeedback-export-progress-view';

    const details = createDetailsView(state, documentRef);

    const spinner = createSpinner(documentRef);

    const message = documentRef.createElement('div');
    message.className = 'local-processfeedback-export-status alert alert-info';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.textContent = getString(state, 'exportStepsReady');

    wrap.append(details, spinner, message);
    fragment.append(wrap);

    const cancelHandlers = [];
    const throwIfCancelled = () => {
        if (isCancelled()) {
            throw createAbortError();
        }
    };

    const setMessage = (content, className = 'alert-info') => {
        if (isCancelled()) {
            return;
        }
        message.className = `local-processfeedback-export-status alert ${className}`;
        message.textContent = '';

        if (typeof content === 'string') {
            message.textContent = content;
            return;
        }

        if (content) {
            message.append(content);
        }
    };

    const reporter = {
        async start(stepId, detailText = '') {
            throwIfCancelled();
            debugLog(windowRef, 'Export step started', {
                stepId,
                detailText,
            });
            setMessage(detailText || getString(state, 'exportStepRunning'));
            await waitForDebugStep(windowRef);
            throwIfCancelled();
        },
        async complete(stepId, detailText = '') {
            throwIfCancelled();
            debugLog(windowRef, 'Export step completed', {
                stepId,
                detailText,
            });
            if (detailText) {
                setMessage(detailText, 'alert-success');
                await waitForDebugStep(windowRef);
                throwIfCancelled();
            }
        },
        error(stepId, detailText = '') {
            debugError(windowRef, 'Export step failed', {
                stepId,
                detailText,
            });
            setMessage(detailText || getString(state, 'zipCreateFailed'), 'alert-danger');
        },
        message(text, className = 'alert-info') {
            debugLog(windowRef, 'Export status message', {
                text,
                className,
            });
            setMessage(text, className);
        },
        setSpinnerVisible(visible) {
            if (isCancelled()) {
                return;
            }
            spinner.hidden = !visible;
        },
        async success(content) {
            throwIfCancelled();
            debugLog(windowRef, 'Export action success message shown');
            setMessage(content, 'alert-success');
            await waitForDebugStep(windowRef);
            throwIfCancelled();
        },
        isCancelled,
        throwIfCancelled,
        onCancel(callback) {
            cancelHandlers.push(callback);
            return () => {
                const index = cancelHandlers.indexOf(callback);
                if (index !== -1) {
                    cancelHandlers.splice(index, 1);
                }
            };
        },
        cancel() {
            debugLog(windowRef, 'Export progress cancelled');
            cancelHandlers.splice(0).forEach((callback) => {
                try {
                    callback();
                } catch (error) {
                    // Cancellation should keep closing the modal even if a browser blocks helper cleanup.
                }
            });
        },
    };

    return {
        element: fragment,
        reporter,
    };
};

const createExportModal = (state, onDownload, onOpenReport, documentRef) => {
    const windowRef = documentRef.defaultView || window;
    const existingModal = documentRef.querySelector(`.${MODAL_CLASS}`);
    if (existingModal) {
        debugLog(windowRef, 'Removing existing export modal before opening a new one');
        existingModal.remove();
    }
    const previousActiveElement = documentRef.activeElement;
    let isClosed = false;
    let activeReporter = null;

    const overlay = documentRef.createElement('div');
    overlay.className = `modal ${MODAL_CLASS} show`;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'local-processfeedback-export-title');
    overlay.style.display = 'block';
    overlay.tabIndex = -1;

    const dialog = documentRef.createElement('div');
    dialog.className = 'modal-dialog modal-dialog-centered';

    const card = documentRef.createElement('main');
    card.className = 'modal-content local-processfeedback-export-card';

    const header = documentRef.createElement('header');
    header.className = 'modal-header local-processfeedback-export-header';
    const title = documentRef.createElement('h2');
    title.className = 'modal-title h5 local-processfeedback-export-title';
    title.id = 'local-processfeedback-export-title';
    title.textContent = getString(state, 'exportModalTitle');
    header.append(title);

    const body = documentRef.createElement('section');
    body.className = 'modal-body';
    const subtitle = documentRef.createElement('p');
    subtitle.className = 'text-muted';
    subtitle.textContent = getString(state, 'exportModalSubtitle');
    body.append(subtitle);
    body.append(createDetailsView(state, documentRef));

    const footer = documentRef.createElement('footer');
    footer.className = 'modal-footer local-processfeedback-export-footer';
    const closeButton = documentRef.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-secondary';
    closeButton.textContent = getString(state, 'exportClose');
    const processButton = documentRef.createElement('button');
    processButton.type = 'button';
    processButton.className = 'btn btn-secondary local-processfeedback-export-action';
    processButton.textContent = getString(state, 'exportProcessData');
    const openReportButton = documentRef.createElement('button');
    openReportButton.type = 'button';
    openReportButton.className = 'btn btn-primary local-processfeedback-export-action';
    openReportButton.textContent = getString(state, 'exportOpenReportButton');
    const actionButtons = documentRef.createElement('div');
    actionButtons.className = 'local-processfeedback-export-actions';
    actionButtons.append(processButton, openReportButton);
    footer.append(closeButton, actionButtons);

    const getFocusableElements = () => Array.from(overlay.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
        if (element.hidden || element.getAttribute('aria-hidden') === 'true') {
            return false;
        }
        return element.getClientRects().length > 0;
    });

    const focusFirstElement = () => {
        const [firstElement] = getFocusableElements();
        if (firstElement) {
            firstElement.focus();
            return;
        }
        overlay.focus();
    };

    const closeModal = () => {
        if (isClosed) {
            return;
        }
        debugLog(windowRef, 'Closing export modal');
        isClosed = true;
        if (activeReporter && typeof activeReporter.cancel === 'function') {
            activeReporter.cancel();
        }
        overlay.remove();
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
            previousActiveElement.focus();
        }
    };

    const showSuccess = async(reporter, actionType) => {
        reporter.setSpinnerVisible(false);
        if (actionType === 'report') {
            await reporter.success(getString(state, 'exportReportReady'));
            return;
        }

        const fragment = documentRef.createDocumentFragment();
        const title = documentRef.createElement('strong');
        title.textContent = getString(state, 'exportDownloadedTitle');
        const copy = documentRef.createElement('p');
        copy.className = 'mb-0';
        copy.append(
            documentRef.createTextNode(getString(state, 'exportDownloadedPrefix')),
            documentRef.createElement('br')
        );
        const link = documentRef.createElement('a');
        link.href = EXPLORE_PROCESS_URL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = getString(state, 'exportOpenReport');
        copy.append(link);
        fragment.append(title, documentRef.createElement('br'), copy);
        await reporter.success(fragment);
    };

    const setActionDisabled = (disabled) => {
        if (isClosed) {
            return;
        }
        processButton.disabled = disabled;
        openReportButton.disabled = disabled;
    };

    const runExportAction = (action, actionType) => {
        debugLog(windowRef, 'Export action started', {
            actionType,
        });
        setActionDisabled(true);
        body.textContent = '';
        const progressView = createProgressView(state, documentRef, () => isClosed);
        activeReporter = progressView.reporter;
        body.append(progressView.element);

        action(getExportDetails(state), progressView.reporter).then(async(downloaded) => {
            if (isClosed || progressView.reporter.isCancelled()) {
                return;
            }
            setActionDisabled(false);
            if (downloaded) {
                debugLog(windowRef, 'Export action completed', {
                    actionType,
                    downloaded,
                });
                await showSuccess(progressView.reporter, actionType);
                return;
            }
            debugLog(windowRef, 'Export action returned no package', {
                actionType,
            });
            progressView.reporter.setSpinnerVisible(false);
            progressView.reporter.error('count', getString(state, 'downloadEmpty'));
        }).catch((error) => {
            if (isClosed || progressView.reporter.isCancelled() || (error && error.name === 'AbortError')) {
                debugLog(windowRef, 'Export action stopped after close or cancel', {
                    actionType,
                    errorName: error && error.name ? error.name : '',
                });
                return;
            }
            debugError(windowRef, 'Export action failed', error);
            setActionDisabled(false);
            progressView.reporter.setSpinnerVisible(false);
            progressView.reporter.error('', error && error.message ? error.message : getString(state, 'zipCreateFailed'));
        });
    };

    processButton.addEventListener('click', (event) => {
        event.preventDefault();
        runExportAction(onDownload, 'download');
    });
    openReportButton.addEventListener('click', (event) => {
        event.preventDefault();
        runExportAction(onOpenReport, 'report');
    });

    closeButton.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });
    overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
            return;
        }
        if (event.key !== 'Tab') {
            return;
        }
        const focusableElements = getFocusableElements();
        if (!focusableElements.length) {
            event.preventDefault();
            overlay.focus();
            return;
        }
        const currentIndex = focusableElements.indexOf(documentRef.activeElement);
        const direction = event.shiftKey ? -1 : 1;
        let nextIndex = currentIndex + direction;
        if (currentIndex === -1) {
            nextIndex = event.shiftKey ? focusableElements.length - 1 : 0;
        } else if (nextIndex < 0) {
            nextIndex = focusableElements.length - 1;
        } else if (nextIndex >= focusableElements.length) {
            nextIndex = 0;
        }
        event.preventDefault();
        focusableElements[nextIndex].focus();
    });

    card.append(header, body, footer);
    dialog.append(card);
    overlay.append(dialog);
    documentRef.body.append(overlay);
    debugLog(windowRef, 'Export modal opened', {
        debugExportSteps: isDebugExportStepsEnabled(windowRef),
    });
    focusFirstElement();
};

const getButtonOpenedKey = (state) => `local_processfeedback:btn_opened:${state.params.userId}`;

const applyPrimaryStyle = (btn, hoverHandlers) => {
    btn.classList.add('btn-secondary');
    hoverHandlers.enter = null;
    hoverHandlers.leave = null;
};

const applySecondaryStyle = (btn, hoverHandlers) => {
    btn.classList.add('btn-secondary');
    hoverHandlers.enter = null;
    hoverHandlers.leave = null;
};

export const getPlacementTarget = (documentRef) => {
    const editorContainer = documentRef.getElementById('fitem_id_onlinetext_editor');
    if (editorContainer) {
        return {
            element: editorContainer,
            position: 'beforebegin',
        };
    }

    const statusTable = documentRef.querySelector('.submissionstatustable, .generaltable.submissionstatus');
    if (statusTable) {
        return {
            element: statusTable,
            position: 'beforebegin',
        };
    }

    const main = documentRef.getElementById('region-main') ||
        documentRef.querySelector('[role="main"]') ||
        documentRef.body;
    return {
        element: main,
        position: 'afterbegin',
    };
};

export const getAssignmentEditorPlacementTarget = (documentRef) => {
    const editorContainer = documentRef.getElementById('fitem_id_onlinetext_editor');
    if (editorContainer) {
        return {
            element: editorContainer,
            position: 'beforebegin',
        };
    }

    const editor = documentRef.getElementById('id_onlinetext_editor') ||
        documentRef.querySelector('textarea[name*="onlinetext"], [contenteditable="true"][id*="onlinetext"], .editor_atto_content');
    const wrapper = editor && editor.closest ?
        editor.closest('.fitem, .form-group, .mb-3') :
        null;

    if (wrapper) {
        return {
            element: wrapper,
            position: 'beforebegin',
        };
    }

    return null;
};

export const getAssignmentStatusPlacementTarget = (documentRef) => {
    const statusTable = documentRef.querySelector('.submissionstatustable, .generaltable.submissionstatus');
    if (!statusTable) {
        return null;
    }

    return {
        element: statusTable,
        position: 'beforebegin',
    };
};

export const getForumBoardPlacementTarget = (documentRef) => {
    const main = documentRef.getElementById('region-main') ||
        documentRef.querySelector('[role="main"]') ||
        documentRef.body;
    const title = [
        main ? main.querySelector('h1, h2') : null,
        documentRef.querySelector('.page-header-headings h1, .page-header-headings h2'),
        documentRef.querySelector('#page-header h1, #page-header h2'),
    ].find((element) => element && element.isConnected);

    if (title) {
        return {
            element: title,
            position: 'afterend',
        };
    }

    return {
        element: main,
        position: 'afterbegin',
    };
};

export const createPanel = (state, onDownload, onOpenReport, documentRef) => {
    const windowRef = documentRef.defaultView || window;
    const panel = documentRef.createElement('section');
    panel.className = `${PANEL_CLASS} my-4`;
    panel.setAttribute('aria-label', getString(state, 'captureIntro', 'Process capture'));

    const card = documentRef.createElement('div');
    card.className = 'local-processfeedback-card';


    const description = documentRef.createElement('p');
    description.className = 'local-processfeedback-description';
    description.append(documentRef.createTextNode(getString(state, 'panelDescription')));
    const learnMoreLink = documentRef.createElement('a');
    learnMoreLink.href = 'https://processfeedback.org/moodle-plugin-for-students';
    learnMoreLink.textContent = getString(state, 'learnMore');
    learnMoreLink.className = 'local-processfeedback-learn-more';
    description.append(learnMoreLink);

    const downloadButton = documentRef.createElement('button');
    downloadButton.type = 'button';
    downloadButton.className = 'btn local-processfeedback-download-button';

    const count = documentRef.createElement('span');
    count.className = COUNT_CLASS;
    count.textContent = String(state.lastRevisionCount);

    downloadButton.append(
        documentRef.createTextNode(getString(state, 'reportButtonLabel')),
        count
    );

    const hoverHandlers = { enter: null, leave: null };
    const buttonOpenedKey = getButtonOpenedKey(state);
    if (localStorage.getItem(buttonOpenedKey) === '1') {
        applySecondaryStyle(downloadButton, hoverHandlers);
    } else {
        applyPrimaryStyle(downloadButton, hoverHandlers);
    }

    downloadButton.addEventListener('mouseenter', () => hoverHandlers.enter && hoverHandlers.enter());
    downloadButton.addEventListener('mouseleave', () => hoverHandlers.leave && hoverHandlers.leave());
    downloadButton.addEventListener('click', () => {
        if (localStorage.getItem(buttonOpenedKey) !== '1') {
            localStorage.setItem(buttonOpenedKey, '1');
            applySecondaryStyle(downloadButton, hoverHandlers);
        }
        debugLog(windowRef, 'Export modal requested from panel', {
            revisionCount: state.lastRevisionCount,
            captureAllowed: state.params.captureAllowed,
            canExportProcessData: state.params.canExportProcessData,
        });
        createExportModal(state, onDownload, onOpenReport, documentRef);
    });

    card.append(description, downloadButton);
    panel.append(card);

    const setRevisionCount = (countValue) => {
        state.lastRevisionCount = Math.max(0, Number(countValue) || 0);
        count.textContent = String(state.lastRevisionCount);
        debugLog(windowRef, 'Panel revision count updated', {
            revisionCount: state.lastRevisionCount,
        });
    };

    const updateCaptureControls = () => {
        const canShow = state.params.canExportProcessData &&
            (state.params.captureAllowed || state.lastRevisionCount > 0);
        downloadButton.disabled = !canShow;
        setElementHidden(panel, !canShow);
        debugLog(windowRef, 'Panel capture controls updated', {
            canShow,
            disabled: downloadButton.disabled,
            revisionCount: state.lastRevisionCount,
        });
    };

    updateCaptureControls();

    return {
        element: panel,
        setRevisionCount,
        setCaptureStatus: () => { },
        setControlHandlers: () => { },
        setStatus: () => { },
        updateCaptureControls,
    };
};
