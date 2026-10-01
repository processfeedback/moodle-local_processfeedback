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
 * Snapshots service for the Process Feedback UI.
 *
 * @module     local_processfeedback/services/snapshots
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {DiffMatchPatch} from 'local_processfeedback/diff_match_patch';

const dmp = new DiffMatchPatch();

/**
 * Build a snapshot record for the given text.
 *
 * Saves a full-text anchor when:
 *   - there is no previous snapshot (first save), or
 *   - (snapshotIndex - 1) % saveFullEvery === 0  (every Nth snapshot)
 *
 * All other snapshots store a DMP patch relative to previousTimestamp (basisKey).
 *
 * @param {string} currentText     The text to snapshot.
 * @param {string|null} previousText    Full text of the last saved snapshot, or null if none.
 * @param {string|null} previousTimestamp  ISO timestamp of the last saved snapshot (used as basisKey).
 * @param {number} snapshotIndex   1-based index of this snapshot (controls anchor cadence).
 * @param {number} saveFullEvery   Save full text every N snapshots. 1 = always full text.
 * @return {Object} Snapshot record.
 */
export const buildSnapshot = (currentText, previousText, previousTimestamp, snapshotIndex, saveFullEvery) => {
    const isAnchor =
        !previousText ||
        !previousTimestamp ||
        (snapshotIndex - 1) % Math.max(saveFullEvery, 1) === 0;

    const patches = dmp.patch_make(previousText || "", currentText);
    const patchText = dmp.patch_toText(patches);

    if (isAnchor) {
        return {
            text: currentText,
            diff: patchText,
            basisKey: previousTimestamp,
            sourceEditor: 'pf-editor-v1.0',
        };
    }

    return {
        text: null,
        diff: patchText,
        basisKey: previousTimestamp,
        sourceEditor: 'pf-editor-v1.0',
    };
};
