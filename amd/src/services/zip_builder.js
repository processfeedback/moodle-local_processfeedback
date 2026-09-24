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
 * ZIP builder for the Process Feedback UI.
 *
 * @module     local_processfeedback/services/zip_builder
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import JSZip from 'local_processfeedback/jszip';
import {getActivityTitle} from 'local_processfeedback/state/store';
import {debugLog} from 'local_processfeedback/utils/logger';

const safeFilenamePart = (value) => (value || 'activity')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'activity';

const getFilenameTitlePart = (value) => safeFilenamePart(value)
    .replace(/-/g, '')
    .substring(0, 10) || 'activity';

const getAuthorInitials = (value) => {
    const initials = String(value || '')
        .trim()
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toLowerCase())
        .join('');

    return initials || 'na';
};

const formatHumanReadableDate = (date = new Date()) => {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};

const formatHumanReadableTime = (date = new Date()) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12 || 12;

    return `${hours}-${minutes}-${meridiem}`;
};

export const buildZipBlob = async(processData, readme = '') => {
    const zip = new JSZip();

    zip.file('process_data.json', JSON.stringify(processData, null, 2));
    zip.file('readme.txt', `${readme}\n`);

    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
    });
    debugLog(null, 'ZIP blob built', {
        size: blob.size,
        files: ['process_data.json', 'readme.txt'],
    });
    return blob;
};

export const getProcessZipFilename = (state, exportDetails = {}, date = new Date()) => {
    const filenameTitle = exportDetails.taskName || getActivityTitle(state);
    const author = exportDetails.author || state.params.userFullName;

    const filename = `process_${getFilenameTitlePart(filenameTitle)}_${getAuthorInitials(author)}_` +
        `${formatHumanReadableDate(date)}_${formatHumanReadableTime(date)}.zip`;
    debugLog(null, 'ZIP filename generated', {
        filename,
    });
    return filename;
};
