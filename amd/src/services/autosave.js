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
 * Autosave service for the Process Feedback UI.
 *
 * @module     local_processfeedback/services/autosave
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getPasteEventText, isPasteEvent} from 'local_processfeedback/components/editor';
import {getString} from 'local_processfeedback/state/store';
import {simpleHash} from 'local_processfeedback/utils/hash';
import {debugError, debugLog} from 'local_processfeedback/utils/logger';

const PASTE_DEDUPE_WINDOW_MS = 500;

export const createAutosaveService = (state, editorBinder, revisionStore, panel, windowRef) => {
    const recentPasteActions = {};
    const pendingPasteActions = [];

    const refreshCount = async() => {
        const count = await revisionStore.getRevisionCount();
        panel.setRevisionCount(count);
        debugLog(windowRef, 'Revision count refreshed', {
            revisionCount: state.lastRevisionCount,
        });
        return state.lastRevisionCount;
    };

    const captureRevision = async() => {
        if (!state.params.captureAllowed) {
            panel.setCaptureStatus();
            debugLog(windowRef, 'Capture skipped: capture not allowed');
            return state.lastRevisionCount;
        }
        if (state.capturePaused) {
            panel.setCaptureStatus();
            debugLog(windowRef, 'Capture skipped: capture paused');
            return state.lastRevisionCount;
        }

        state.tickCount += 1;
        debugLog(windowRef, 'Capture tick started', {
            tickCount: state.tickCount,
        });

        const editors = editorBinder.detectEditors ? editorBinder.detectEditors() : [editorBinder.detectEditor()].filter(Boolean);
        if (!editors.length) {
            panel.setStatus('', 'text-muted');
            debugLog(windowRef, 'Capture skipped: no active editors detected');
            return state.lastRevisionCount;
        }
        debugLog(windowRef, 'Editors detected for capture', {
            editorCount: editors.length,
            editorSources: editors.map((editor) => editor.source || 'unknown'),
        });

        const previousCount = state.lastRevisionCount;
        let latestCount = previousCount;
        let storedCount = 0;
        let hasWorkingText = false;

        for (const editor of editors) {
            const workingText = editor.getText();
            const textHash = simpleHash(workingText);
            const textLength = workingText.length;
            const sourceKey = editor.sourceEditorId || editor.id;

            if (!workingText.trim()) {
                debugLog(windowRef, 'Editor skipped: working text is empty', {
                    editorId: editor.id || '',
                    sourceEditorId: editor.sourceEditorId || '',
                });
                continue;
            }

            hasWorkingText = true;
            if (textHash === state.lastTextHashesBySource[sourceKey]) {
                debugLog(windowRef, 'Editor skipped: text hash unchanged', {
                    editorId: editor.id || '',
                    sourceEditorId: editor.sourceEditorId || '',
                    textLength,
                });
                continue;
            }

            latestCount = await revisionStore.storeNewRevision(
                editor,
                workingText,
                new Date(Date.now() + storedCount).toISOString()
            );
            state.lastTextHashesBySource[sourceKey] = textHash;
            state.lastTextLengthsBySource[sourceKey] = textLength;
            if (latestCount > previousCount) {
                storedCount += 1;
                debugLog(windowRef, 'Revision stored from editor', {
                    editorId: editor.id || '',
                    sourceEditorId: editor.sourceEditorId || '',
                    textLength,
                    revisionCount: latestCount,
                });
            }
        }

        panel.setRevisionCount(latestCount);
        if (!hasWorkingText) {
            panel.setStatus(getString(state, 'typingReady'), 'text-muted');
            debugLog(windowRef, 'Capture completed: no non-empty working text');
            return latestCount;
        }
        if (latestCount > previousCount) {
            panel.setStatus(getString(state, 'savedRevision'), 'text-success');
            debugLog(windowRef, 'Capture completed with new revisions', {
                previousCount,
                latestCount,
                storedCount,
            });
        } else {
            panel.setStatus('', 'text-muted');
            debugLog(windowRef, 'Capture completed without new revisions', {
                revisionCount: latestCount,
            });
        }
        return latestCount;
    };

    const captureRevisionSafely = async() => {
        if (state.captureInProgress) {
            return;
        }
        state.captureInProgress = true;
        try {
            await captureRevision();
        } catch (error) {
            debugError(windowRef, 'Capture failed', error);
            panel.setStatus(
                getString(state, 'captureFailed'),
                'text-danger'
            );
        } finally {
            state.captureInProgress = false;
        }
    };

    const startProcessFeedbackInterval = () => {
        const intervalMs = Number(state.params.snapshotInterval || 5000);

        if (state.captureIntervalId || !state.params.captureAllowed || state.capturePaused) {
            debugLog(windowRef, 'Capture interval not started', {
                hasInterval: Boolean(state.captureIntervalId),
                captureAllowed: state.params.captureAllowed,
                capturePaused: state.capturePaused,
            });
            return;
        }

        state.captureIntervalId = windowRef.setInterval(captureRevisionSafely, intervalMs);
        debugLog(windowRef, 'Capture interval started', {
            intervalMs,
        });
    };

    const stopProcessFeedbackInterval = () => {
        if (!state.captureIntervalId) {
            return;
        }
        windowRef.clearInterval(state.captureIntervalId);
        state.captureIntervalId = null;
        debugLog(windowRef, 'Capture interval stopped');
    };

    const showStorageFailure = (error = null) => {
        panel.setStatus(
            getString(state, 'storageUpdateFailed'),
            'text-danger'
        );
        debugError(windowRef, 'Storage update failed', error);
    };

    const shouldStorePasteAction = (editor, pastedText, detectedAt) => {
        const sourceKey = editor.sourceEditorId || editor.id || 'unknown-editor';
        const dedupeKey = [
            'paste',
            sourceKey,
            simpleHash(pastedText),
        ].join(':');
        const sourceDedupeKey = [
            'paste-source',
            sourceKey,
        ].join(':');
        const lastDetectedAt = recentPasteActions[dedupeKey] || 0;
        const lastSourceDetectedAt = recentPasteActions[sourceDedupeKey] || 0;

        if (
            detectedAt - lastDetectedAt < PASTE_DEDUPE_WINDOW_MS ||
            detectedAt - lastSourceDetectedAt < PASTE_DEDUPE_WINDOW_MS
        ) {
            return false;
        }

        recentPasteActions[dedupeKey] = detectedAt;
        recentPasteActions[sourceDedupeKey] = detectedAt;
        return true;
    };

    const handlePasteAction = (editor, editorEvent, workingText) => {
        if (!isPasteEvent(editorEvent)) {
            return;
        }

        const pastedText = getPasteEventText(editorEvent);
        if (!pastedText || !shouldStorePasteAction(editor, pastedText, Date.now())) {
            return;
        }

        const timestamp = new Date().toISOString();
        debugLog(windowRef, 'Paste detected', {
            editorId: editor.id || '',
            sourceEditorId: editor.sourceEditorId || '',
            timestamp,
            pastedTextLength: pastedText.length,
            workingTextLength: workingText.length,
        });

        const pasteAction = revisionStore.storePasteAction(
            editor,
            pastedText,
            workingText.length,
            timestamp
        ).catch(showStorageFailure);

        pendingPasteActions.push(pasteAction);
        pasteAction.finally(() => {
            const index = pendingPasteActions.indexOf(pasteAction);
            if (index !== -1) {
                pendingPasteActions.splice(index, 1);
            }
        });
    };

    const flushPendingPasteActions = async() => {
        debugLog(windowRef, 'Flushing pending paste actions', {
            pendingCount: pendingPasteActions.length,
        });
        while (pendingPasteActions.length) {
            await Promise.all(pendingPasteActions.slice());
        }
        debugLog(windowRef, 'Pending paste actions flushed');
    };

    const handleEditorInput = (boundEditor = null, editorEvent = null) => {
        if (!state.params.captureAllowed || state.capturePaused) {
            panel.setCaptureStatus();
            debugLog(windowRef, 'Editor input ignored: capture unavailable', {
                captureAllowed: state.params.captureAllowed,
                capturePaused: state.capturePaused,
            });
            return;
        }

        const editor = boundEditor || editorBinder.detectEditor();
        if (!editor) {
            debugLog(windowRef, 'Editor input ignored: no editor detected');
            return;
        }

        const workingText = editor.getText();
        revisionStore.updateCurrentEditorText(editor, workingText).catch(showStorageFailure);
        handlePasteAction(editor, editorEvent, workingText);

        state.lastInputAt = Date.now();
        debugLog(windowRef, 'Editor input captured', {
            editorId: editor.id || '',
            sourceEditorId: editor.sourceEditorId || '',
            workingTextLength: workingText.length,
            eventType: editorEvent && editorEvent.type ? editorEvent.type : '',
        });
        panel.setStatus(
            '',
            'text-success'
        );
    };

    const bindTypingCapture = () => {
        const editorBound = editorBinder.bindTypingCapture(handleEditorInput);
        if (editorBound) {
            panel.setStatus('', 'text-muted');
        }
        debugLog(windowRef, 'Typing capture binding attempted', {
            editorBound,
        });
        return editorBound;
    };

    const bindTypingCaptureWhenReady = (attempt = 0) => {
        if (bindTypingCapture()) {
            return;
        }
        if (attempt >= 20) {
            panel.setStatus('', 'text-muted');
            debugLog(windowRef, 'Typing capture binding gave up', {
                attempt,
            });
            return;
        }
        debugLog(windowRef, 'Typing capture binding retry scheduled', {
            nextAttempt: attempt + 1,
        });
        windowRef.setTimeout(() => bindTypingCaptureWhenReady(attempt + 1), 500);
    };

    const watchEditorLifecycle = (onEditorsChanged = null) => {
        editorBinder.watchEditorLifecycle(handleEditorInput, () => {
            if (typeof onEditorsChanged === 'function') {
                onEditorsChanged();
            }
            debugLog(windowRef, 'Editor lifecycle change handled');
            panel.setStatus('', 'text-muted');
            startProcessFeedbackInterval();
        });
    };

    return {
        bindTypingCaptureWhenReady,
        captureRevision,
        flushPendingPasteActions,
        refreshCount,
        startProcessFeedbackInterval,
        stopProcessFeedbackInterval,
        watchEditorLifecycle,
    };
};
