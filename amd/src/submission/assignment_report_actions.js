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

import { initProcessFeedbackDashboardButton } from 'local_processfeedback/submission/dashboard_report_button';
import { getSingleWritingProcessReportLinks, initSingleWritingProcessReportButtons } from 'local_processfeedback/submission/single_report_buttons';
import { getProcessFeedbackZipLinks, markProcessFeedbackSubmissionTables } from 'local_processfeedback/submission/report_transfer';
import {debugError, debugLog} from 'local_processfeedback/utils/logger';

export const initAssignmentReportActions = (state, windowRef, documentRef) => {
    if (!state || !state.params || state.params.moduleName !== 'assign') {
        debugLog(windowRef, 'Assignment report actions skipped: not an assignment page');
        return;
    }

    const links = getProcessFeedbackZipLinks(documentRef);
    const singleReportLinks = getSingleWritingProcessReportLinks(documentRef);
    if (links.length === 0 && singleReportLinks.length === 0) {
        debugLog(windowRef, 'Assignment report actions skipped: no report ZIP links found');
        return;
    }

    debugLog(windowRef, 'Assignment report actions initialising', {
        dashboardLinkCount: links.length,
        singleReportLinkCount: singleReportLinks.length,
    });
    markProcessFeedbackSubmissionTables(links);
    initSingleWritingProcessReportButtons(windowRef, documentRef, state).catch((error) => {
        debugError(windowRef, 'Single writing-process report button initialisation failed', error);
    });
    if (links.length > 0) {
        initProcessFeedbackDashboardButton(windowRef, documentRef).catch((error) => {
            debugError(windowRef, 'Dashboard report button initialisation failed', error);
        });
    }
};

export const initAssignmentReportActionsForCurrentPage = () => initAssignmentReportActions({
    params: {
        moduleName: 'assign',
    },
}, window, document);
