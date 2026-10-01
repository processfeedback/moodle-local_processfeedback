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
import {debugError, debugLog, debugWarn} from 'local_processfeedback/utils/logger';
import Config from 'core/config';

const SUMMARY_FILENAME = 'process_summary.json';
const MAX_ACTIVE_GAP_MS = 300000;

const getSortedSnapshotKeys = (timeAndTextSnapshots) => Object.keys(timeAndTextSnapshots || {}).sort();

const buildSummary = (timeAndTextSnapshots, revisionCount) => {
    const keys = getSortedSnapshotKeys(timeAndTextSnapshots);
    const activeDays = new Set();
    let editTimeMs = 0;

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
    });

    return {
        'edit_time_seconds': Math.floor(editTimeMs / 1000),
        'revision_count': Number(revisionCount) || 0,
        'active_days': activeDays.size,
        'first_edit': keys[0] || '',
        'last_edit': keys[keys.length - 1] || '',
    };
};

/**
 * Upload one file into the user's draft area through Moodle's core upload repository.
 *
 * Moodle applies its upload size limits, draft area limits and antivirus scan; the
 * assignment submission plugin validates the files again before storing them.
 *
 * @param {Object} state Process Feedback state.
 * @param {Window} windowRef Window reference.
 * @param {number} draftItemId Draft item ID owned by the assignment submission form.
 * @param {Blob} blob File content.
 * @param {string} filename File name.
 * @param {string} acceptedType Accepted file extension, for example '.zip'.
 * @return {Promise<void>}
 */
const uploadFileToDraftArea = async(state, windowRef, draftItemId, blob, filename, acceptedType) => {
    debugLog(windowRef, 'Draft-area upload started', {
        draftItemId,
        filename,
        size: blob.size,
    });
    const form = new FormData();
    form.append('repo_upload_file', blob, filename);
    form.append('sesskey', Config.sesskey);
    form.append('repo_id', state.params.uploadRepositoryId);
    form.append('ctx_id', state.params.contextId);
    form.append('itemid', draftItemId);
    form.append('savepath', '/');
    form.append('title', filename);
    form.append('overwrite', 1);
    form.append('accepted_types[]', acceptedType);

    const response = await windowRef.fetch(
        `${Config.wwwroot}/repository/repository_ajax.php?action=upload`,
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
    if (json.event) {
        throw new Error(`PF upload not stored: ${json.event}`);
    }

    debugLog(windowRef, 'Draft-area upload completed', {
        filename,
        draftItemId,
    });
};

const getZipReadme = (state) => [
    getString(state, 'zipReadmeGenerated'),
    getString(state, 'zipReadmeData'),
    getString(state, 'zipReadmePolicy'),
].join('\n');

export const uploadProcessFeedbackSubmission = async(state, revisionStore, autosaveService, windowRef, draftItemId) => {
    debugLog(windowRef, 'Submission process-data upload requested', {draftItemId});

    if (!draftItemId) {
        debugWarn(windowRef, 'No draft area is available for process data. ' +
            'Submission will proceed without process data.');
        return 0;
    }
    if (!state.params.uploadRepositoryId) {
        debugWarn(windowRef, 'The Moodle upload repository is not available to this user. ' +
            'Submission will proceed without process data.');
        return 0;
    }

    try {
        if (autosaveService && typeof autosaveService.captureRevision === 'function') {
            await autosaveService.captureRevision();
        }
    } catch (error) {
        debugError(windowRef, 'Failed to capture final revision before upload. ' +
            'Proceeding with previously saved snapshots.', error);
    }

    try {
        if (autosaveService && typeof autosaveService.flushPendingPasteActions === 'function') {
            await autosaveService.flushPendingPasteActions();
        }
    } catch (error) {
        debugError(windowRef, 'Failed to flush pending paste actions before upload. ' +
            'Some paste activity may be missing from the process data.', error);
    }

    let processData;
    try {
        processData = await revisionStore.fetchDataFromIdb();
    } catch (error) {
        debugError(windowRef, 'Could not read process data from IndexedDB. ' +
            'This may happen if the student is submitting from a different device or browser. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    const timeAndTextSnapshots = processData.timeAndTextSnapshots || {};
    const snapshotKeys = getSortedSnapshotKeys(timeAndTextSnapshots);

    if (snapshotKeys.length === 0) {
        debugWarn(windowRef, 'No writing snapshots found in local storage. ' +
            'This is expected if the student wrote their work in a different browser or device. ' +
            'Submission will proceed without process data.');
        debugLog(windowRef, 'Submission process-data upload skipped: no snapshots');
        return 0;
    }

    let revisionCount;
    try {
        revisionCount = await revisionStore.getRevisionCount();
    } catch (error) {
        debugError(windowRef, 'Could not retrieve revision count from IndexedDB. ' +
            'Using snapshot count as fallback.', error);
        revisionCount = snapshotKeys.length;
    }

    let summary;
    try {
        summary = buildSummary(timeAndTextSnapshots, revisionCount);
    } catch (error) {
        debugError(windowRef, 'Summary calculation failed. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    let payload;
    try {
        payload = await createPayload(state, revisionStore);
    } catch (error) {
        debugError(windowRef, 'Failed to build process data payload. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    let zipBlob;
    try {
        zipBlob = await buildZipBlob(payload, getZipReadme(state));
    } catch (error) {
        debugError(windowRef, 'Failed to create process data ZIP. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    const summaryBlob = new Blob([JSON.stringify(summary, null, 2)], {
        type: 'application/json',
    });
    const zipFilename = getProcessZipFilename(state);

    try {
        await uploadFileToDraftArea(state, windowRef, draftItemId, zipBlob, zipFilename, '.zip');
    } catch (error) {
        debugError(windowRef, 'Failed to upload process data ZIP to Moodle draft area. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    try {
        await uploadFileToDraftArea(state, windowRef, draftItemId, summaryBlob, SUMMARY_FILENAME, '.json');
    } catch (error) {
        debugError(windowRef, 'Failed to upload process summary JSON to Moodle draft area. ' +
            'Submission will proceed without process data.', error);
        return 0;
    }

    debugLog(windowRef, 'Submission process-data upload completed', {
        zipFilename,
        draftItemId,
        revisionCount,
    });
    return draftItemId;
};
