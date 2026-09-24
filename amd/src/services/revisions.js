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
 * Revisions service for the Process Feedback UI.
 *
 * @module     local_processfeedback/services/revisions
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {buildSnapshot} from 'local_processfeedback/services/snapshots';
import {getActivityTitle, getStoreName, getString} from 'local_processfeedback/state/store';
import {debugLog} from 'local_processfeedback/utils/logger';
import {safeHref} from 'local_processfeedback/utils/url';

const MAX_PASTE_PREVIEW = 100000;

const getSourceEditorId = (state, editor) => {
    if (editor.sourceEditorId) {
        return editor.sourceEditorId;
    }

    return [
        state.params.moduleName === 'forum' ? 'moodle-forum' : 'moodle-online-text',
        state.params.cmId,
        state.params.userId,
        editor.id,
    ].join(':');
};

const normalisePastedText = (pastedText) => String(pastedText || '').replace(/<\/?[^>]+(>|$)/g, '');

const getPastedTextPreview = (text) => (
    text.length <= MAX_PASTE_PREVIEW ? text : text.slice(0, MAX_PASTE_PREVIEW) + '...'
);

const aggregatePasteEvents = (localPackage) => {
    const pasteEventsFull = {
        editorPathDOM: [],
        ptime: [],
        pchar: [],
        pastedText: [],
        existingCharacters: [],
    };

    Object.entries(localPackage).forEach(([key, value]) => {
        if (key.indexOf('pasteAction_') !== 0 || !value || typeof value !== 'object') {
            return;
        }

        pasteEventsFull.editorPathDOM.push(value.editorPathDOM || '');
        pasteEventsFull.ptime.push(value.ptime);
        pasteEventsFull.pchar.push(value.pchar);
        pasteEventsFull.pastedText.push(value.pastedText);
        pasteEventsFull.existingCharacters.push(value.existingCharacters);
    });

    return pasteEventsFull.ptime.length ? pasteEventsFull : undefined;
};

const transformIdbRevisionRecords = (localPackage) => {
    const processFootPrints = JSON.parse(JSON.stringify(localPackage));
    const revisions = {};

    Object.keys(processFootPrints).forEach((key) => {
        if (key.indexOf('snapshot_') === 0) {
            const revisionDate = key.substring('snapshot_'.length);
            if (revisionDate) {
                revisions[revisionDate] = processFootPrints[key];
                delete processFootPrints[key];
            }
        }
        if (key.indexOf('pasteAction_') === 0 || key.indexOf('paste_') === 0) {
            delete processFootPrints[key];
        }
    });

    processFootPrints.timeAndTextSnapshots = revisions;
    delete processFootPrints.previousWorkingText;
    delete processFootPrints.previousWorkingTextTimeStamp;
    delete processFootPrints.previousWorkingTextBySourceEditor;
    delete processFootPrints.previousWorkingTextTimeStampBySourceEditor;
    return processFootPrints;
};

export const createRevisionStore = (state, storage, windowRef) => {
    const updateCurrentEditorText = async(editor, workingText) => {
        await storage.idbUpdateTable(getStoreName(state), {
            workingText,
            lastActive: new Date().toISOString(),
            url: safeHref(windowRef),
            editorPathDOM: getSourceEditorId(state, editor),
            taskID: getStoreName(state),
        });
        debugLog(windowRef, 'Current editor text metadata updated', {
            storeName: getStoreName(state),
            editorPathDOM: getSourceEditorId(state, editor),
            workingTextLength: String(workingText || '').length,
        });
    };

    const storeNewRevision = async(editor, workingText, workingTextTimeStamp) => {
        const storeName = getStoreName(state);
        const values = await storage.getDataFromIndexedDB(storeName, [
            'previousWorkingText',
            'previousWorkingTextTimeStamp',
            'previousWorkingTextBySourceEditor',
            'previousWorkingTextTimeStampBySourceEditor',
            'expiryDateForTechnicalSupport',
            'footprintCountsTentative',
            'startTimeStamp',
        ]);

        const editorPathDOM = getSourceEditorId(state, editor);
        const previousTextBySource = values.previousWorkingTextBySourceEditor &&
            typeof values.previousWorkingTextBySourceEditor === 'object' ?
            values.previousWorkingTextBySourceEditor :
            {};
        const previousTimestampBySource = values.previousWorkingTextTimeStampBySourceEditor &&
            typeof values.previousWorkingTextTimeStampBySourceEditor === 'object' ?
            values.previousWorkingTextTimeStampBySourceEditor :
            {};
        const hasPreviousForSource = Object.prototype.hasOwnProperty.call(previousTextBySource, editorPathDOM);
        const isLegacySingleEditorDuplicate = state.params.moduleName !== 'forum' &&
            !hasPreviousForSource &&
            typeof values.previousWorkingText !== 'undefined' &&
            values.previousWorkingText === workingText;

        if ((hasPreviousForSource && previousTextBySource[editorPathDOM] === workingText) || isLegacySingleEditorDuplicate) {
            debugLog(windowRef, 'Revision store skipped duplicate text', {
                storeName,
                editorPathDOM,
                revisionCount: Number(values.footprintCountsTentative) || 0,
            });
            return Number(values.footprintCountsTentative) || 0;
        }

        const revisionCount = (Number(values.footprintCountsTentative) || 0) + 1;
        const revisionIso = new Date(workingTextTimeStamp).toISOString();

        const previousText = hasPreviousForSource ? previousTextBySource[editorPathDOM] : null;
        const previousTimestamp = Object.prototype.hasOwnProperty.call(previousTimestampBySource, editorPathDOM) ?
            previousTimestampBySource[editorPathDOM] :
            null;
        const saveFullEvery = 20;

        const snapshot = buildSnapshot(
            workingText,
            previousText,
            previousTimestamp,
            revisionCount,
            saveFullEvery
        );
        snapshot.sourceEditor = editorPathDOM;

        const revisionInfo = {
            workingTextTimeStamp: revisionIso,
            workingText,
            footprintCountsTentative: revisionCount,
            previousWorkingText: workingText,
            previousWorkingTextTimeStamp: revisionIso,
            previousWorkingTextBySourceEditor: Object.assign({}, previousTextBySource, {
                [editorPathDOM]: workingText,
            }),
            previousWorkingTextTimeStampBySourceEditor: Object.assign({}, previousTimestampBySource, {
                [editorPathDOM]: revisionIso,
            }),
            [`snapshot_${revisionIso}`]: snapshot,
            taskType: 'lms-moodle',
            languageId: 'plaintext',
            editorPathDOM,
            taskID: storeName,
            author: state.params.userFullName,
            email: state.params.userEmail,
            institute: state.params.siteName,
        };

        if (!values.expiryDateForTechnicalSupport) {
            revisionInfo.expiryDateForTechnicalSupport =
                new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6).toISOString();
        }
        if (!values.startTimeStamp) {
            revisionInfo.startTimeStamp = new Date().toISOString();
        }
        if (!values.footprintCountsTentative) {
            revisionInfo.taskName = getActivityTitle(state);
            revisionInfo.courseName = state.params.courseName || getString(state, 'untitledCourse');
        }

        await storage.idbUpdateTable(storeName, revisionInfo);
        debugLog(windowRef, 'Revision stored in IndexedDB', {
            storeName,
            editorPathDOM,
            revisionCount,
            textLength: workingText.length,
        });
        return revisionCount;
    };

    const storePasteAction = async(editor, pastedText, workingTextCharLength, timestamp) => {
        const storeName = getStoreName(state);
        const pasteIso = new Date(timestamp).toISOString();
        const editorPathDOM = getSourceEditorId(state, editor);
        const text = normalisePastedText(pastedText);
        const pasteRecord = {
            editorPathDOM,
            ptime: pasteIso,
            pchar: text.length,
            pastedText: getPastedTextPreview(text),
            existingCharacters: typeof workingTextCharLength === 'number' ? workingTextCharLength : -1,
        };

        await storage.idbUpdateTable(storeName, {
            [`pasteAction_${pasteIso}`]: pasteRecord,
            lastPasteAt: pasteIso,
            editorPathDOM,
            taskID: storeName,
        });

        debugLog(windowRef, 'Paste action stored in IndexedDB', {
            storeName,
            editorPathDOM,
            pasteIso,
            pastedTextLength: text.length,
        });
        return pasteIso;
    };

    const fetchDataFromIdb = async() => {
        const localPackage = await storage.getAllKeyValuesFromInstance(getStoreName(state));
        const processFootPrints = transformIdbRevisionRecords(localPackage);
        const pasteEventsFull = aggregatePasteEvents(localPackage);

        if (pasteEventsFull) {
            processFootPrints.pasteEventsFull = pasteEventsFull;
        }

        debugLog(windowRef, 'Revision data fetched from IndexedDB', {
            storeName: getStoreName(state),
            keyCount: Object.keys(localPackage).length,
            revisionCount: Object.keys(processFootPrints.timeAndTextSnapshots || {}).length,
            pasteCount: pasteEventsFull ? pasteEventsFull.ptime.length : 0,
        });
        return processFootPrints;
    };

    const getRevisionCount = async() => {
        const values = await storage.getDataFromIndexedDB(getStoreName(state), [
            'footprintCountsTentative',
        ]);
        debugLog(windowRef, 'Revision count read from IndexedDB', {
            storeName: getStoreName(state),
            revisionCount: values.footprintCountsTentative || 0,
        });
        return values.footprintCountsTentative || 0;
    };

    return {
        fetchDataFromIdb,
        getRevisionCount,
        storePasteAction,
        storeNewRevision,
        updateCurrentEditorText,
    };
};
