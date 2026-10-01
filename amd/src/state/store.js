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
 * State store for the Process Feedback UI.
 *
 * @module     local_processfeedback/state/store
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Language string keys passed to the UI; each also accepts its lowercase form. */
const STRING_KEYS = [
    'captureIntro',
    'downloadZip',
    'reportButtonLabel',
    'panelDescription',
    'learnMore',
    'downloadButtonTitleIntro',
    'downloadButtonTitleAction',
    'downloadButtonTitleRevision',
    'savedRevision',
    'typingReady',
    'downloadReady',
    'downloadEmpty',
    'zipCreateFailed',
    'zipReadmeGenerated',
    'zipReadmeData',
    'zipReadmePolicy',
    'captureFailed',
    'storageUpdateFailed',
    'untitledTask',
    'untitledCourse',
    'exportModalTitle',
    'exportModalSubtitle',
    'exportFieldTitle',
    'exportFieldName',
    'exportFieldInstitution',
    'exportFieldEmail',
    'exportClose',
    'exportProcessData',
    'exportOpenReportButton',
    'exportPackagingTitle',
    'exportStepsReady',
    'exportStepQueued',
    'exportStepRunning',
    'exportStepDone',
    'exportStepError',
    'exportStepOpenReport',
    'exportStepOpenReportDetail',
    'exportStepCapture',
    'exportStepCaptureDetail',
    'exportStepPaste',
    'exportStepPasteDetail',
    'exportStepCount',
    'exportStepCountDetail',
    'exportStepPull',
    'exportStepPullDetail',
    'exportStepPayload',
    'exportStepPayloadDetail',
    'exportStepZip',
    'exportStepZipDetail',
    'exportStepDownload',
    'exportStepDownloadDetail',
    'exportStepTransfer',
    'exportErrorPopupBlocked',
    'exportErrorExplorerTimeout',
    'exportDownloadedTitle',
    'exportDownloadedPrefix',
    'exportReportReady',
    'exportOpenReport',
    'savingProcessData',
];

/**
 * Return the first truthy value of the given keys, or the fallback.
 *
 * @param {Object} source Source object.
 * @param {string[]} keys Keys in priority order.
 * @param {*} fallback Value returned when no key has a truthy value.
 * @return {*}
 */
const pickValue = (source, keys, fallback) => {
    const key = keys.find((candidate) => source[candidate]);
    return key ? source[key] : fallback;
};

/**
 * Whether any of the given keys is strictly true.
 *
 * @param {Object} source Source object.
 * @param {string[]} keys Keys to check.
 * @return {boolean}
 */
const pickFlag = (source, keys) => keys.some((key) => source[key] === true);

const normaliseStrings = (strings = {}) => STRING_KEYS.reduce((normalised, key) => {
    normalised[key] = pickValue(strings, [key, key.toLowerCase()], '');
    return normalised;
}, {});

const normaliseParams = (params = {}) => ({
    captureAllowed: pickFlag(params, ['captureAllowed', 'captureallowed']),
    captureEnabledByDefault: pickFlag(params, ['captureEnabledByDefault', 'captureenabledbydefault']),
    contextEnabled: pickFlag(params, ['contextEnabled', 'contextenabled']),
    canUse: pickFlag(params, ['canUse', 'canuse']),
    canExportProcessData: pickFlag(params, ['canExportProcessData', 'canexportprocessdata']),
    contextId: Number(pickValue(params, ['contextId', 'contextid'], 0)),
    courseId: Number(pickValue(params, ['courseId', 'courseid'], 0)),
    courseName: pickValue(params, ['courseName', 'coursename'], ''),
    cmId: Number(pickValue(params, ['cmId', 'cmid'], 0)),
    moduleName: pickValue(params, ['moduleName', 'modName', 'modname'], 'assign'),
    activityInstanceId: Number(pickValue(
        params,
        ['activityInstanceId', 'activityinstanceid', 'assignmentInstanceId', 'assignmentinstanceid'],
        0
    )),
    activityTitle: pickValue(params, ['activityTitle', 'activitytitle', 'assignmentTitle', 'assignmenttitle'], ''),
    assignmentInstanceId: Number(pickValue(params, ['assignmentInstanceId', 'assignmentinstanceid', 'activityInstanceId'], 0)),
    assignmentTitle: pickValue(params, ['assignmentTitle', 'assignmenttitle', 'activityTitle', 'activitytitle'], ''),
    pageUrl: pickValue(params, ['pageUrl', 'pageurl'], ''),
    siteName: pickValue(params, ['siteName', 'sitename'], ''),
    siteHash: pickValue(params, ['siteHash', 'sitehash'], ''),
    userId: Number(pickValue(params, ['userId', 'userid'], 0)),
    userFullName: pickValue(params, ['userFullName', 'userfullname'], ''),
    userEmail: pickValue(params, ['userEmail', 'useremail'], ''),
    projectId: pickValue(params, ['projectId', 'projectid'], ''),
    uploadRepositoryId: Number(pickValue(params, ['uploadRepositoryId', 'uploadrepositoryid'], 0)),
    snapshotInterval: Number(pickValue(params, ['snapshotInterval', 'snapshotinterval'], 5000)),
    compressSnapshots: false,
    strings: normaliseStrings(params.strings),
});

export const createState = (params) => ({
    captureIntervalId: null,
    captureInProgress: false,
    capturePaused: false,
    lastInputAt: 0,
    tickCount: 0,
    lastTextHashesBySource: {},
    lastTextLengthsBySource: {},
    lastRevisionCount: 0,
    params: normaliseParams(params),
});

export const ensureProjectId = (state) => {
    if (state.params.projectId) {
        return state.params.projectId;
    }

    state.params.projectId = [
        'local_processfeedback',
        state.params.userId,
        state.params.courseId,
        state.params.cmId,
    ].join(':');

    return state.params.projectId;
};

export const getString = (state, key, fallback = '') => {
    if (state.params && state.params.strings && state.params.strings[key]) {
        return state.params.strings[key];
    }
    return fallback;
};

export const getStoreName = (state) => state.params.projectId;

export const getTaskId = (state) => state.params.pageUrl || state.params.projectId;

export const getActivityTitle = (state) => state.params.activityTitle ||
    state.params.assignmentTitle ||
    getString(state, 'untitledTask');
