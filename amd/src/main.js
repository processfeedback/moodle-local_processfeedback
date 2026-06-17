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
 * Main entrypoint for the Process Feedback UI.
 *
 * @module     local_processfeedback/main
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {createPanel, getAssignmentEditorPlacementTarget, getForumBoardPlacementTarget, PANEL_CLASS} from 'local_processfeedback/components/panel';
import {createEditorBinder} from 'local_processfeedback/components/editor';
import {createAutosaveService} from 'local_processfeedback/services/autosave';
import {fetchBootstrapData} from 'local_processfeedback/services/bootstrap';
import {createZipExportService} from 'local_processfeedback/services/export_zip';
import {createRevisionStore} from 'local_processfeedback/services/revisions';
import {createStorage} from 'local_processfeedback/services/storage';
import {createState, ensureProjectId} from 'local_processfeedback/state/store';
import {initSubmissionInterceptor} from 'local_processfeedback/submission/interceptor';
import { notifyException } from 'local_processfeedback/utils/notifications';
import { initAssignmentReportActions } from 'local_processfeedback/submission/assignment_report_actions';
import {debugError, debugLog} from 'local_processfeedback/utils/logger';

const ROOT_SELECTOR = '#local-processfeedback-root';
const EDITOR_WAIT_TIMEOUT_MS = 10000;

const waitForEditor = (editorBinder, windowRef, documentRef) => new Promise((resolve) => {
    if (editorBinder.detectEditor()) {
        resolve(true);
        return;
    }

    if (!windowRef.MutationObserver || !documentRef.body) {
        resolve(false);
        return;
    }

    let observer = null;
    const timeout = windowRef.setTimeout(() => {
        if (observer) {
            observer.disconnect();
        }
        resolve(false);
    }, EDITOR_WAIT_TIMEOUT_MS);

    observer = new windowRef.MutationObserver(() => {
        if (!editorBinder.detectEditor()) {
            return;
        }
        observer.disconnect();
        windowRef.clearTimeout(timeout);
        resolve(true);
    });

    observer.observe(documentRef.body, {
        childList: true,
        subtree: true,
    });
});

const normaliseInitConfig = (configOrContextid, cmid) => {
    if (typeof configOrContextid === 'object' && configOrContextid !== null) {
        return {
            contextid: Number(configOrContextid.contextid || configOrContextid.contextId || 0),
            courseid: Number(configOrContextid.courseid || configOrContextid.courseId || 0),
            cmid: Number(configOrContextid.cmid || configOrContextid.cmId || 0),
            rootselector: configOrContextid.rootselector || configOrContextid.rootSelector || ROOT_SELECTOR,
        };
    }

    return {
        contextid: Number(configOrContextid || 0),
        courseid: 0,
        cmid: Number(cmid || 0),
        rootselector: ROOT_SELECTOR,
    };
};

const createPanelRegistry = (state, onDownload, onOpenReport, documentRef) => {
    const panels = [];

    const addPanel = (placement, sourceEditorId = '') => {
        if (!placement || !placement.element || !placement.element.isConnected) {
            return null;
        }

        const panel = createPanel(state, onDownload, onOpenReport, documentRef);
        panel.element.dataset.sourceEditorId = sourceEditorId;
        placement.element.insertAdjacentElement(placement.position, panel.element);
        panels.push(panel);
        return panel;
    };

    const getConnectedPanels = () => panels.filter((panel) => panel.element.isConnected);

    const movePanel = (placement, sourceEditorId = '') => {
        if (!placement || !placement.element || !placement.element.isConnected) {
            return null;
        }

        const panel = getConnectedPanels()[0] || createPanel(state, onDownload, onOpenReport, documentRef);
        panel.element.dataset.sourceEditorId = sourceEditorId;
        if (panels.indexOf(panel) === -1) {
            panels.push(panel);
        }
        placement.element.insertAdjacentElement(placement.position, panel.element);
        return panel;
    };

    const removePanels = () => {
        panels.forEach((panel) => {
            if (panel.element.isConnected) {
                panel.element.remove();
            }
        });
    };

    const eachPanel = (callback) => {
        panels.forEach((panel) => {
            if (panel.element.isConnected) {
                callback(panel);
            }
        });
    };

    return {
        addPanel,
        movePanel,
        removePanels,
        hasPanelForSource: (sourceEditorId) => panels.some((panel) => (
            panel.element.isConnected &&
            panel.element.dataset.sourceEditorId === sourceEditorId
        )),
        panelCount: () => getConnectedPanels().length,
        setRevisionCount: (countValue) => {
            state.lastRevisionCount = Math.max(0, Number(countValue) || 0);
            eachPanel((panel) => panel.setRevisionCount(countValue));
        },
        setCaptureStatus: () => eachPanel((panel) => panel.setCaptureStatus()),
        setStatus: (statusMessage, statusClass = 'text-muted') => {
            eachPanel((panel) => panel.setStatus(statusMessage, statusClass));
        },
        updateCaptureControls: () => eachPanel((panel) => panel.updateCaptureControls()),
    };
};

/**
 * Initialise the Process Feedback browser-side activity capture UI.
 *
 * @param {Object|number} configOrContextid Small bootstrap config, or legacy context ID.
 * @param {number} cmid Course module ID for legacy calls.
 * @return {Promise<void>}
 */
export const init = async(configOrContextid, cmid) => {
    const config = normaliseInitConfig(configOrContextid, cmid);
    debugLog(window, 'Initialising capture UI', {
        contextid: config.contextid,
        cmid: config.cmid,
        rootselector: config.rootselector,
    });

    if (!window.indexedDB || !config.contextid || !config.cmid) {
        debugLog(window, 'Initialisation skipped: missing IndexedDB or required Moodle IDs', {
            hasIndexedDB: Boolean(window.indexedDB),
            contextid: config.contextid,
            cmid: config.cmid,
        });
        return;
    }

    const root = document.querySelector(config.rootselector);
    if (!root || root.dataset.processfeedbackInitialised === 'true') {
        debugLog(window, 'Initialisation skipped: root missing or already initialised', {
            hasRoot: Boolean(root),
            initialised: root ? root.dataset.processfeedbackInitialised : '',
        });
        return;
    }
    root.dataset.processfeedbackInitialised = 'true';

    let params;
    try {
        params = await fetchBootstrapData(config.contextid, config.cmid);
        debugLog(window, 'Bootstrap data loaded', {
            enabled: params && params.enabled,
            canuse: params && params.canuse,
            moduleName: params && (params.moduleName || params.modname),
        });
    } catch (error) {
        root.dataset.processfeedbackInitialised = 'false';
        debugError(window, 'Bootstrap data failed', error);
        notifyException(error);
        return;
    }

    if (!params || params.enabled === false || params.canuse === false) {
        root.dataset.processfeedbackInitialised = 'false';
        debugLog(window, 'Initialisation stopped by bootstrap permissions', {
            hasParams: Boolean(params),
            enabled: params && params.enabled,
            canuse: params && params.canuse,
        });
        return;
    }

    const state = createState(params);
    ensureProjectId(state);
    debugLog(window, 'State created', {
        projectId: state.params.projectId,
        moduleName: state.params.moduleName,
        captureAllowed: state.params.captureAllowed,
        canExportProcessData: state.params.canExportProcessData,
        snapshotInterval: state.params.snapshotInterval,
    });

    const storage = createStorage();
    state.capturePaused = false;

    const editorBinder = createEditorBinder(state, window, document);
    const revisionStore = createRevisionStore(state, storage, window);
    let zipExportService = null;

    const panelRegistry = createPanelRegistry(state, (exportDetails = {}, status = null) => {
        if (!zipExportService) {
            return Promise.resolve();
        }
        return zipExportService.downloadZip(exportDetails, status);
    }, (exportDetails = {}, status = null) => {
        if (!zipExportService) {
            return Promise.resolve();
        }
        return zipExportService.openReport(exportDetails, status);
    }, document);

    const autosaveService = createAutosaveService(state, editorBinder, revisionStore, panelRegistry, window);
    zipExportService = createZipExportService(state, revisionStore, autosaveService, panelRegistry, window, document);

    if (state.params.moduleName === 'assign') {
        initAssignmentReportActions(state, window, document);
        initSubmissionInterceptor(state, revisionStore, autosaveService, window, document);
    }

    const syncForumPanels = () => {
        if (state.params.moduleName !== 'forum') {
            return false;
        }

        const editor = editorBinder.detectEditors().find((candidate) => (
            candidate && candidate.placement && candidate.sourceEditorId
        ));
        const placement = editor ? editor.placement :
            (state.lastRevisionCount > 0 ? getForumBoardPlacementTarget(document) : null);
        const sourceEditorId = editor ? editor.sourceEditorId : 'forum-board';

        if (!placement) {
            panelRegistry.removePanels();
            debugLog(window, 'Forum panel sync removed panels: no placement available');
            return false;
        }

        const panel = panelRegistry.movePanel(placement, sourceEditorId);
        if (panel) {
            panelRegistry.setRevisionCount(state.lastRevisionCount);
            panelRegistry.updateCaptureControls();
            debugLog(window, 'Forum panel synced', {
                sourceEditorId,
                panelCount: panelRegistry.panelCount(),
                revisionCount: state.lastRevisionCount,
            });
        }

        return panelRegistry.panelCount() > 0;
    };

    const syncAssignmentPanels = () => {
        if (state.params.moduleName !== 'assign') {
            return false;
        }

        const editor = editorBinder.detectEditor();
        const placement = editor ? getAssignmentEditorPlacementTarget(document) : null;
        if (!placement) {
            panelRegistry.removePanels();
            debugLog(window, 'Assignment panel sync removed panels: no editor placement available');
            return false;
        }

        const panel = panelRegistry.movePanel(placement);
        if (panel) {
            panelRegistry.setRevisionCount(state.lastRevisionCount);
            panelRegistry.updateCaptureControls();
            debugLog(window, 'Assignment panel synced', {
                panelCount: panelRegistry.panelCount(),
                revisionCount: state.lastRevisionCount,
            });
        }

        return panelRegistry.panelCount() > 0;
    };

    const syncPanels = () => (
        state.params.moduleName === 'forum' ? syncForumPanels() : syncAssignmentPanels()
    );

    if (state.params.moduleName === 'forum') {
        syncForumPanels();
    } else if (!document.querySelector(`.${PANEL_CLASS}`)) {
        syncAssignmentPanels();
    }

    if (state.params.captureAllowed || state.params.canExportProcessData) {
        await autosaveService.refreshCount();
    }
    syncPanels();
    panelRegistry.updateCaptureControls();

    autosaveService.watchEditorLifecycle(syncPanels);
    if (await waitForEditor(editorBinder, window, document)) {
        debugLog(window, 'Editor ready; starting autosave bindings');
        syncPanels();
        autosaveService.startProcessFeedbackInterval();
        autosaveService.bindTypingCaptureWhenReady();
    } else {
        debugLog(window, 'Editor wait timed out');
        panelRegistry.setStatus('', 'text-muted');
    }
};
