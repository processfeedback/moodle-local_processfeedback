<?php
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
 * English language strings for the Process Feedback local plugin.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string['capturefailed'] = 'Process Feedback capture failed in this browser.';
$string['captureintro'] = 'Process Feedback capture';
$string['capturenoticecapture'] = 'Process Feedback captures typing snapshots locally in this browser for this activity.';
$string['capturenoticeexport'] = 'The snapshots stay in browser storage unless you export them as a ZIP file.';
$string['choosewhereenableprocessfeedback'] = 'Choose where to enable Process Feedback';
$string['courseenablementmoved'] = 'Process Feedback course options are now managed from course settings.';
$string['downloadbuttontitleaction'] = 'Download the captured revisions as a ZIP file for Process Feedback exploration.';
$string['downloadbuttontitleintro'] = 'Process Feedback tracks revision snapshots while you edit this Moodle text.';
$string['downloadbuttontitlerevision'] = 'Current revision: {$a}.';
$string['downloadempty'] = 'No revisions are available for this activity in this browser.';
$string['downloadready'] = 'ZIP export ready.';
$string['downloadzip'] = 'Download Process Data';
$string['enableassignmentscourse'] = 'Enable in assignments';
$string['enableassignmentscourse_desc'] = 'When enabled, Process Feedback activates in students assignments and records their edits in their browser. The recorded writing process report will be automatically submitted in an assignment, if the teacher enables "Auto submit on assignment submission" in Submission Types for the assignment. Otherwise, students will need to share their writing process reports manually.';
$string['enableassignmentscourse_help'] = 'When enabled, Process Feedback activates in students assignments and records their edits in their browser. The recorded writing process report will be automatically submitted in an assignment, if the teacher enables "Auto submit on assignment submission" in Submission Types for the assignment. Otherwise, students will need to share their writing process reports manually.';
$string['enabledassignmentincourseids'] = 'Courses allowing Process Feedback in assignments';
$string['enabledassignmentincourseids_desc'] = 'Enter Moodle course IDs to enable Process Feedback for assignments. You can also enable or disable it from each course\'s settings; the two stay in sync. Use commas, spaces, or one course ID per line. To disable Process Feedback on assignments in all courses, clear this field. NOTE: This also enables the assignment plugin (separate plugin) if it is installed, so teachers can enable/disable automatic submission of writing process reports in each assignment.';
$string['enabledcourseids_invalid'] = 'One or more course IDs do not exist.';
$string['enabledcourseids_invalidformat'] = 'Enter positive numeric course IDs only.';
$string['enabledforumsincourseids'] = 'Courses allowing Process Feedback in forums';
$string['enabledforumsincourseids_desc'] = 'Enter Moodle course IDs to enable Process Feedback for forums. You can also enable or disable it from each course\'s settings; the two stay in sync. Use commas, spaces, or one course ID per line. To disable Process Feedback on forums in all courses, clear this field.';
$string['enableforumscourse'] = 'Enable in forums';
$string['enableforumscourse_desc'] = 'When enabled, Process Feedback activates in students forums and records their edits in their browser. Students will need to share their writing process reports manually; it is not submitted automatically.';
$string['enableforumscourse_help'] = 'When enabled, Process Feedback activates in students forums and records their edits in their browser. Students will need to share their writing process reports manually; it is not submitted automatically.';
$string['exportclose'] = 'Close';
$string['exportdownloadedprefix'] = 'Once the download is complete, you can load it at';
$string['exportdownloadedtitle'] = 'Writing process data downloaded';
$string['exporterrorexplorertimeout'] = 'ProcessFeedback did not become ready in time.';
$string['exporterrorpopupblocked'] = 'Could not open ProcessFeedback. Check whether pop-ups are blocked.';
$string['exportfieldemail'] = 'Email';
$string['exportfieldinstitution'] = 'Institution';
$string['exportfieldname'] = 'Your name';
$string['exportfieldtitle'] = 'Title for this work';
$string['exportmodalsubtitle'] = 'To view writing process report, click on Open Report.';
$string['exportmodaltitle'] = 'Writing Process Report';
$string['exportopenreport'] = 'Process Feedback Report Page';
$string['exportopenreportbutton'] = 'Open Report';
$string['exportpackagingtitle'] = 'Packaging process data';
$string['exportprocessdata'] = 'Download Data';
$string['exportreportready'] = 'Report is opened in a new tab.';
$string['exportstepcapture'] = 'Capturing the latest writing revision.';
$string['exportstepcapturedetail'] = 'Checking the current editor text and saving it if it changed.';
$string['exportstepcount'] = 'Counting available revisions.';
$string['exportstepcountdetail'] = 'Checking how many writing snapshots are available for this activity.';
$string['exportstepdone'] = 'Done';
$string['exportstepdownload'] = 'Starting the ZIP download.';
$string['exportstepdownloaddetail'] = 'Handing the ZIP file to the browser download manager.';
$string['exportsteperror'] = 'Error';
$string['exportstepopenreport'] = 'Opening the report explorer tab.';
$string['exportstepopenreportdetail'] = 'Opening a blank tab now so the browser does not block the report explorer.';
$string['exportsteppaste'] = 'Saving pending paste activity.';
$string['exportsteppastedetail'] = 'Writing any queued paste events into browser storage.';
$string['exportsteppayload'] = 'Structuring the report payload.';
$string['exportsteppayloaddetail'] = 'Formatting revisions, metadata, and activity details for Process Feedback.';
$string['exportsteppull'] = 'Pulling revisions from browser storage.';
$string['exportsteppulldetail'] = 'Reading the saved revisions and paste activity from IndexedDB.';
$string['exportstepqueued'] = 'Queued';
$string['exportsteprunning'] = 'Running';
$string['exportstepsready'] = 'Choose an action to start processing the writing process report.';
$string['exportsteptransfer'] = 'Sending the ZIP to the report explorer.';
$string['exportstepzip'] = 'Building the process data ZIP.';
$string['exportstepzipdetail'] = 'Compressing process_data.json and the README into a ZIP file.';
$string['learnmore'] = 'Learn more';
$string['paneldescription'] = 'Your writing process is tracked on this device so you can explore, share or submit it.';
$string['pluginname'] = 'Process Feedback Local';
$string['pluginnotenabled'] = 'Process Feedback is disabled by the site administrator.';
$string['privacy:metadata:core_files'] = 'Process Feedback may temporarily store writing process ZIP and summary files in the user draft file area before assignment submission.';
$string['privacy:metadata:processfeedback_explorer'] = 'Process Feedback can send writing process ZIP data to the Process Feedback report explorer when a user chooses to open a report.';
$string['privacy:metadata:processfeedback_explorer:activity'] = 'The Moodle activity title, task identifier, and related activity context included in the writing process export.';
$string['privacy:metadata:processfeedback_explorer:course'] = 'The Moodle course name included in the writing process export.';
$string['privacy:metadata:processfeedback_explorer:email'] = 'The email address entered by the user or supplied by Moodle for the writing process export.';
$string['privacy:metadata:processfeedback_explorer:institute'] = 'The institution or Moodle site name included in the writing process export.';
$string['privacy:metadata:processfeedback_explorer:name'] = 'The author name entered by the user or supplied by Moodle for the writing process export.';
$string['privacy:metadata:processfeedback_explorer:pasteevents'] = 'Paste event details captured in the browser and included in the writing process export.';
$string['privacy:metadata:processfeedback_explorer:revisions'] = 'Writing revision timestamps and text snapshots captured in the browser and included in the writing process export.';
$string['privacy:metadata:processfeedback_explorer:writingtext'] = 'The current or final writing text included in the writing process export.';
$string['processfeedback:capture'] = 'Capture own activity text snapshots (deprecated)';
$string['processfeedback:use'] = 'Use Process Feedback';
$string['processfeedback:viewreports'] = 'View Process Feedback reports';
$string['processfeedbackprivacy_notice'] = 'Process Feedback may temporarily store activity process data in this browser for this activity.';
$string['reportbuttonlabel'] = 'My Writing Process Report';
$string['reportdashboardbutton'] = 'Writing Process Dashboard';
$string['reportdashboardopenedmany'] = 'Opened dashboard with {$a} files';
$string['reportdashboardopenedone'] = 'Opened dashboard with {$a} file';
$string['reporterrorpopupblocked'] = 'Could not open ProcessFeedback. Check whether pop-ups are blocked.';
$string['reportfilesendfailed'] = 'File sending failed!';
$string['reportnozipfiles'] = 'No process data ZIP files are available on this page!';
$string['reportsendfailed'] = 'Could not send ZIPs!';
$string['reportsendingone'] = 'Sending 1 of 1...';
$string['reportsendingrange'] = 'Sending {$a->start}-{$a->end} of {$a->total}...';
$string['reportsinglebutton'] = 'Writing Process Report';
$string['reportsingleopened'] = 'Report Opened';
$string['reportwaiting'] = 'Waiting for ProcessFeedback...';
$string['savedrevision'] = 'Revision captured.';
$string['savingprocessdata'] = 'Saving process data...';
$string['settings'] = 'Process Feedback Local';
$string['storageupdatefailed'] = 'Process Feedback could not update local browser storage.';
$string['teachernotice_assign'] = 'Students can see their writing process in this course\'s assignments. {$a}';
$string['teachernotice_assign_form'] = 'Auto submission of the writing process reports can be enabled or disabled for this assignment. {$a}';
$string['teachernotice_forum'] = 'Students can see their writing process in this course\'s forums. {$a}';
$string['teachernotice_forum_form'] = 'Students\' writing process reports are not automatically submitted in forums. {$a}';
$string['typingready'] = 'Capture active';
$string['untitledcourse'] = 'Untitled course';
$string['untitledtask'] = 'Untitled activity';
$string['zipcreatefailed'] = 'Process Feedback could not create the ZIP in this browser.';
$string['zipreadmedata'] = 'Handle this file according to the policies of the institution or the person who owns the data.';
$string['zipreadmegenerated'] = 'This writing process data contains edit history and was generated by the Process Feedback Moodle plugin.';
$string['zipreadmepolicy'] = 'To explore the writing process report, upload the ZIP file at https://app.processfeedback.org/exploreprocess';
