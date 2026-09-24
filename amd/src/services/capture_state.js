
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
 * Capture state service for the Process Feedback UI.
 *
 * @module     local_processfeedback/services/capture_state
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getStoreName} from 'local_processfeedback/state/store';

const PAUSED_KEY = 'capturePaused';
const PAUSED_AT_KEY = 'capturePausedAt';

const getContext = (state) => ({
    component: 'local_processfeedback',
    userid: state.params.userId,
    courseid: state.params.courseId,
    cmid: state.params.cmId,
    storeName: getStoreName(state),
});

export const getCaptureState = async(storage, state) => {
    const context = getContext(state);
    const values = await storage.getDataFromIndexedDB(context.storeName, [PAUSED_KEY]);
    return {
        context,
        paused: values[PAUSED_KEY] === true,
    };
};

export const setCapturePaused = async(storage, state, paused) => {
    const context = getContext(state);
    await storage.idbUpdateTable(context.storeName, {
        [PAUSED_KEY]: paused === true,
        [PAUSED_AT_KEY]: paused === true ? new Date().toISOString() : '',
    });
    return {
        context,
        paused: paused === true,
    };
};
