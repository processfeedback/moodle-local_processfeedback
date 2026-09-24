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
 * Debug logging helpers for the Process Feedback UI.
 *
 * @module     local_processfeedback/utils/logger
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const DEBUG_LOG_KEY = 'local_processfeedback:debug';
export const DEBUG_EXPORT_STEPS_KEY = 'local_processfeedback:debug_export_steps';

const LOG_PREFIX = '[ProcessFeedback]';
const LEGACY_DEBUG_LOG_KEYS = ['processfeedbackDebug', 'localProcessFeedbackDebug'];
const LEGACY_DEBUG_EXPORT_STEPS_KEYS = ['DEBUG_EXPORT_STEPS', 'processfeedbackDebugExportSteps'];
const TRUE_VALUES = ['1', 'true', 'yes', 'on', 'debug'];

const getWindowRef = (windowRef = null) => windowRef || (typeof window !== 'undefined' ? window : null);

const getLocalStorageValue = (windowRef, key) => {
    const currentWindow = getWindowRef(windowRef);
    try {
        if (!currentWindow || !currentWindow.localStorage) {
            return '';
        }
        return currentWindow.localStorage.getItem(key) || '';
    } catch (error) {
        return '';
    }
};

const isTruthyValue = (value) => TRUE_VALUES.indexOf(String(value || '').trim().toLowerCase()) !== -1;

const hasTruthyLocalStorageValue = (windowRef, keys) => keys.some((key) => (
    isTruthyValue(getLocalStorageValue(windowRef, key))
));

export const isDebugLoggingEnabled = (windowRef = null) => hasTruthyLocalStorageValue(
    windowRef,
    [DEBUG_LOG_KEY].concat(LEGACY_DEBUG_LOG_KEYS)
);

export const isDebugExportStepsEnabled = (windowRef = null) => hasTruthyLocalStorageValue(
    windowRef,
    [DEBUG_EXPORT_STEPS_KEY].concat(LEGACY_DEBUG_EXPORT_STEPS_KEYS)
);

const writeConsole = (method, windowRef, message, details = null) => {
    const currentWindow = getWindowRef(windowRef);
    if (!isDebugLoggingEnabled(currentWindow) || !currentWindow || !currentWindow.console) {
        return;
    }

    const consoleMethod = currentWindow.console[method] || currentWindow.console.log;
    if (typeof consoleMethod !== 'function') {
        return;
    }

    if (details === null || typeof details === 'undefined') {
        consoleMethod.call(currentWindow.console, LOG_PREFIX, message);
        return;
    }

    consoleMethod.call(currentWindow.console, LOG_PREFIX, message, details);
};

export const debugLog = (windowRef, message, details = null) => {
    writeConsole('log', windowRef, message, details);
};

export const debugWarn = (windowRef, message, details = null) => {
    writeConsole('warn', windowRef, message, details);
};

export const debugError = (windowRef, message, details = null) => {
    writeConsole('error', windowRef, message, details);
};
