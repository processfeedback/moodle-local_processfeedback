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
 * Logging helpers for the Process Feedback UI.
 *
 * Messages go through core/log, whose level Moodle sets per page: warnings and errors are
 * always shown, debug messages only when the site has developer debugging enabled.
 *
 * @module     local_processfeedback/utils/logger
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Config from 'core/config';
import Log from 'core/log';

const LOG_SOURCE = 'local_processfeedback';

/**
 * Convert optional log details to text, because core/log only prints a single message.
 *
 * @param {*} details Extra details for the message.
 * @return {string}
 */
const formatDetails = (details) => {
    if (details === null || typeof details === 'undefined') {
        return '';
    }
    // Duck-type errors so ones created in another window or frame are still readable.
    if (typeof details === 'object' && typeof details.message === 'string' && ('stack' in details || 'name' in details)) {
        return details.stack || `${details.name}: ${details.message}`;
    }
    if (typeof details === 'string') {
        return details;
    }
    try {
        return JSON.stringify(details);
    } catch (error) {
        return String(details);
    }
};

const formatMessage = (message, details) => {
    const detailText = formatDetails(details);
    return detailText ? `${message} ${detailText}` : message;
};

/**
 * Whether the site has developer debugging enabled.
 *
 * @return {boolean}
 */
export const isDeveloperDebugEnabled = () => Boolean(Config.developerdebug);

/**
 * Whether export progress steps should be slowed down so they can be inspected.
 *
 * @return {boolean}
 */
export const isDebugExportStepsEnabled = () => isDeveloperDebugEnabled();

export const debugLog = (windowRef, message, details = null) => {
    Log.debug(formatMessage(message, details), LOG_SOURCE);
};

export const debugWarn = (windowRef, message, details = null) => {
    Log.warn(formatMessage(message, details), LOG_SOURCE);
};

export const debugError = (windowRef, message, details = null) => {
    Log.error(formatMessage(message, details), LOG_SOURCE);
};
