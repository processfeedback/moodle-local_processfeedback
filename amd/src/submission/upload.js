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
 * Submission upload for the Process Feedback UI.
 *
 * @module     local_processfeedback/submission/upload
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {createPayload} from 'local_processfeedback/services/payload';
import {buildZipBlob, getProcessZipFilename} from 'local_processfeedback/services/zip_builder';
import {getString} from 'local_processfeedback/state/store';
import {debugLog, debugError} from 'local_processfeedback/utils/logger';
import Config from 'core/config';

const SUMMARY_FILENAME = 'process_summary.json';
const MAX_ACTIVE_GAP_MS = 300000;

/** LocalStorage key to bypass the entire Process Feedback upload for debugging. */
const DEBUG_BYPASS_KEY = 'pf_debug_bypass_upload';

const getSortedSnapshotKeys = (timeAndTextSnapshots) => Object.keys(timeAndTextSnapshots || {}).sort();

const getSnapshotText = (snapshot) => {
    if (!snapshot || typeof snapshot.text === 'undefined' || snapshot.text === null) {
        return '';
    }
    return String(snapshot.text);
};

const buildSummary = (timeAndTextSnapshots, revisionCount) => {
    const keys = getSortedSnapshotKeys(timeAndTextSnapshots);
    const activeDays = new Set();
    let editTimeMs = 0;
    let largestChangeChars = 0;

    keys.forEach((key, index) => {
        activeDays.add(key.substring(0, 10));

        if (index === 0) {
            return;
        }

        const previousKey = keys[index - 1];
        const currentTimestamp = Date.parse(key);
        const previousTimestamp = Date.parse(previousKey);
        if (!Number.isNaN(currentTimestamp) && !Number.isNaN(previousTimestamp)) {
            const gap = currentTimestamp - previousTimestamp;
            if (gap > 0 && gap < MAX_ACTIVE_GAP_MS) {
                editTimeMs += gap;
            }
        }

        const previousText = getSnapshotText(timeAndTextSnapshots[previousKey]);
        const currentText = getSnapshotText(timeAndTextSnapshots[key]);
        largestChangeChars = Math.max(largestChangeChars, Math.abs(currentText.length - previousText.length));
    });

    return {
        edit_time_seconds: Math.floor(editTimeMs / 1000),
        revision_count: Number(revisionCount) || 0,
        active_days: activeDays.size,
        first_edit: keys[0] || '',
        last_edit: keys[keys.length - 1] || '',
        largest_change_chars: largestChangeChars,
    };
};

const uploadFileToDraftArea = async(state, windowRef, draftItemId, blob, filename) => {
    debugLog(windowRef, 'Draft-area upload started', {
        draftItemId,
        filename,
        size: blob.size,
    });
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('draftitemid', draftItemId);
    form.append('contextid', state.params.contextId);
    form.append('cmid', state.params.cmId);
    form.append('sesskey', Config.sesskey);

    const response = await windowRef.fetch(
        `${Config.wwwroot}/local/processfeedback/upload.php`,
        {method: 'POST', body: form}
    );

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`PF upload failed: ${response.status}`);
    }

    const json = JSON.parse(responseText);
    if (json.error) {
        throw new Error(`PF upload error: ${json.error}`);
    }

    const itemId = Number(json.itemid) || draftItemId;
    debugLog(windowRef, 'Draft-area upload completed', {
        filename,
        itemId,
    });
    return itemId;
};

const getZipReadme = (state) => [
    getString(state, 'zipReadmeGenerated'),
    getString(state, 'zipReadmeData'),
    getString(state, 'zipReadmePolicy'),
].join('\n');

/**
 * Check whether the debug bypass flag is set in localStorage.
 * To enable: localStorage.setItem('pf_debug_bypass_upload', '1')
 * To disable: localStorage.removeItem('pf_debug_bypass_upload')
 *
 * @param {Window} windowRef
 * @returns {boolean}
 */
const isDebugBypassEnabled = (windowRef) => {
    try {
        return windowRef.localStorage.getItem(DEBUG_BYPASS_KEY) === 'true';
    } catch (e) {
        return false;
    }
};

export const uploadProcessFeedbackSubmission = async(state, revisionStore, autosaveService, windowRef) => {
    // Debug bypass: simulates missing process data (e.g. student submitted from a different device).
    // No upload occurs and no draft item ID is returned — submission proceeds normally without process data.
    // To enable: localStorage.setItem('pf_debug_bypass_upload', '1')
    // To disable: localStorage.removeItem('pf_debug_bypass_upload')
    if (isDebugBypassEnabled(windowRef)) {
        console.warn('[ProcessFeedback] DEBUG BYPASS ACTIVE (pf_debug_bypass_upload=1): ' +
            'Skipping process data upload. Submission will proceed without process data. ' +
            'This simulates a student submitting from a device with no captured writing process.');
        return 0;
    }

    debugLog(windowRef, 'Submission process-data upload requested');

    try {
        if (autosaveService && typeof autosaveService.captureRevision === 'function') {
            await autosaveService.captureRevision();
        }
    } catch (error) {
        console.error('[ProcessFeedback] Failed to capture final revision before upload. ' +
            'Proceeding with previously saved snapshots.', error);
    }

    try {
        if (autosaveService && typeof autosaveService.flushPendingPasteActions === 'function') {
            await autosaveService.flushPendingPasteActions();
        }
    } catch (error) {
        console.error('[ProcessFeedback] Failed to flush pending paste actions before upload. ' +
            'Some paste activity may be missing from the process data.', error);
    }

    let processData;
    try {
        processData = await revisionStore.fetchDataFromIdb();
    } catch (error) {
        console.error('[ProcessFeedback] Could not read process data from IndexedDB. ' +
            'This may happen if the student is submitting from a different device or browser. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    const timeAndTextSnapshots = processData.timeAndTextSnapshots || {};
    const snapshotKeys = getSortedSnapshotKeys(timeAndTextSnapshots);

    if (snapshotKeys.length === 0) {
        console.warn('[ProcessFeedback] No writing snapshots found in local storage. ' +
            'This is expected if the student wrote their work in a different browser or device. ' +
            'Submission will proceed without process data.');
        debugLog(windowRef, 'Submission process-data upload skipped: no snapshots');
        return 0;
    }

    let revisionCount;
    try {
        revisionCount = await revisionStore.getRevisionCount();
    } catch (error) {
        console.error('[ProcessFeedback] Could not retrieve revision count from IndexedDB. ' +
            'Using snapshot count as fallback.', error);
        revisionCount = snapshotKeys.length;
    }

    let summary;
    try {
        summary = buildSummary(timeAndTextSnapshots, revisionCount);
    } catch (error) {
        console.error('[ProcessFeedback] Summary calculation failed. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    let payload;
    try {
        payload = await createPayload(state, revisionStore);
    } catch (error) {
        console.error('[ProcessFeedback] Failed to build process data payload. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    let zipBlob;
    try {
        zipBlob = await buildZipBlob(payload, getZipReadme(state));
    } catch (error) {
        console.error('[ProcessFeedback] Failed to create process data ZIP. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    const summaryBlob = new Blob([JSON.stringify(summary, null, 2)], {
        type: 'application/json',
    });
    const zipFilename = getProcessZipFilename(state);

    let actualItemId;
    try {
        actualItemId = await uploadFileToDraftArea(state, windowRef, 0, zipBlob, zipFilename);
    } catch (error) {
        console.error('[ProcessFeedback] Failed to upload process data ZIP to Moodle draft area. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    let finalItemId;
    try {
        finalItemId = await uploadFileToDraftArea(state, windowRef, actualItemId, summaryBlob, SUMMARY_FILENAME);
    } catch (error) {
        console.error('[ProcessFeedback] Failed to upload process summary JSON to Moodle draft area. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    debugLog(windowRef, 'Submission process-data upload completed', {
        zipFilename,
        finalItemId,
        revisionCount,
    });
    return finalItemId;
};