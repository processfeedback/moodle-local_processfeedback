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
 * Payload builder for the Process Feedback UI.
 *
 * @module     local_processfeedback/services/payload
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getActivityTitle, getString, getTaskId} from 'local_processfeedback/state/store';
import {debugLog} from 'local_processfeedback/utils/logger';

const progressStart = async(progress, stepId, message = '') => {
    if (progress && typeof progress.start === 'function') {
        await progress.start(stepId, message);
    }
};

const progressComplete = (progress, stepId, message = '') => {
    if (progress && typeof progress.complete === 'function') {
        return progress.complete(stepId, message);
    }
    return Promise.resolve();
};

/**
 * Build the process footprints for the payload, preferring the export details, then stored values, then defaults.
 *
 * @param {Object} state Process Feedback state.
 * @param {Object} processFootPrints Process data read from IndexedDB.
 * @param {Object} exportDetails Details entered in the export dialog.
 * @return {Object}
 */
const buildProcessFootPrints = (state, processFootPrints, exportDetails) => {
    const now = new Date().toISOString();
    const footPrints = {
        author: exportDetails.author || processFootPrints.author || state.params.userFullName,
        courseName: processFootPrints.courseName || state.params.courseName || getString(state, 'untitledCourse'),
        editorPathDOM: processFootPrints.editorPathDOM || '',
        email: exportDetails.email || processFootPrints.email || state.params.userEmail,
        institute: exportDetails.institute || processFootPrints.institute || state.params.siteName,
        startTimeStamp: processFootPrints.startTimeStamp || now,
        taskID: getTaskId(state),
        taskName: exportDetails.taskName || processFootPrints.taskName || getActivityTitle(state),
        workingText: processFootPrints.workingText || '',
        workingTextTimeStamp: processFootPrints.workingTextTimeStamp || now,
        timeAndTextSnapshots: processFootPrints.timeAndTextSnapshots || {},
        taskType: 'lms-moodle',
        textSnapshotInterval: Number(state.params.snapshotInterval || 5000),
    };
    if (processFootPrints.pasteEventsFull) {
        footPrints.pasteEventsFull = processFootPrints.pasteEventsFull;
    }
    return footPrints;
};

export const createPayload = async(state, revisionStore, exportDetails = {}, progress = null) => {
    await progressStart(progress, 'pull', getString(state, 'exportStepPullDetail'));
    const processFootPrints = await revisionStore.fetchDataFromIdb();
    await progressComplete(progress, 'pull');
    await progressStart(progress, 'payload', getString(state, 'exportStepPayloadDetail'));
    const count = Number(processFootPrints.footprintCountsTentative) || 0;
    const expiry = processFootPrints.expiryDateForTechnicalSupport ||
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6).toISOString();
    const finalProcessFootPrints = buildProcessFootPrints(state, processFootPrints, exportDetails);
    const {author, email, institute, taskName} = finalProcessFootPrints;

    // Optional payload encryption is future work. This browser-only export
    // intentionally marks the payload as not encrypted.
    const payload = {
        processPayload: {
            metadata: {
                name: author,
                email,
                projectTitle: taskName,
                projectType: 'lms-moodle',
                institute,
                footprintCountsTentative: count,
            },
            isProcessFootprintsEncrypted: false,
            isProcessFootprintsCompressed: false,
            processFootPrintsData: {
                processFootPrints: finalProcessFootPrints,
            },
            expiryDateForTechnicalSupport: expiry,
            thisDataStructureVersion: 'v1.0.0',
        },
    };
    await progressComplete(progress, 'payload');
    debugLog(null, 'Process payload created', {
        taskID: finalProcessFootPrints.taskID,
        revisionCount: count,
        snapshotCount: Object.keys(finalProcessFootPrints.timeAndTextSnapshots).length,
        hasPasteEvents: Boolean(finalProcessFootPrints.pasteEventsFull),
        projectType: payload.processPayload.metadata.projectType,
    });
    return payload;
};
