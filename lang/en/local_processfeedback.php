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

$string['pluginname'] = 'Process Feedback Local';
$string['settings'] = 'Process Feedback Local';
$string['enabledassignmentincourseids'] = 'Courses allowing Process Feedback in assignments';
$string['enabledassignmentincourseids_desc'] = 'Enter Moodle course IDs to enable Process Feedback for assignments. You can also enable or disable it from each course\'s settings; the two stay in sync. Use commas, spaces, or one course ID per line. To disable Process Feedback on assignments in all courses, clear this field. NOTE: This also enables the assignment plugin (separate plugin) if it is installed, so teachers can enable/disable automatic submission of writing process reports in each assignment.';
$string['enabledforumsincourseids'] = 'Courses allowing Process Feedback in forums';
$string['enabledforumsincourseids_desc'] = 'Enter Moodle course IDs to enable Process Feedback for forums. You can also enable or disable it from each course\'s settings; the two stay in sync. Use commas, spaces, or one course ID per line. To disable Process Feedback on forums in all courses, clear this field.';
$string['enableforumscourse'] = 'Enable in forums';
$string['enableforumscourse_desc'] = 'When enabled, Process Feedback activates in students forums and records their edits in their browser. Students will need to share their writing process reports manually; it is not submitted automatically.';
$string['enableforumscourse_help'] = 'When enabled, Process Feedback activates in students forums and records their edits in their browser. Students will need to share their writing process reports manually; it is not submitted automatically.';
$string['enableassignmentscourse'] = 'Enable in assignments';
$string['enableassignmentscourse_desc'] = 'When enabled, Process Feedback activates in students assignments and records their edits in their browser. The recorded writing process report will be automatically submitted in an assignment, if the teacher enables "Auto submit on assignment submission" in Submission Types for the assignment. Otherwise, students will need to share their writing process reports manually.';
$string['enableassignmentscourse_help'] = 'When enabled, Process Feedback activates in students assignments and records their edits in their browser. The recorded writing process report will be automatically submitted in an assignment, if the teacher enables "Auto submit on assignment submission" in Submission Types for the assignment. Otherwise, students will need to share their writing process reports manually.';
$string['choosewhereenableprocessfeedback'] = 'Choose where to enable Process Feedback';
$string['enabledcourseids_invalid'] = 'One or more course IDs do not exist.';
$string['enabledcourseids_invalidformat'] = 'Enter positive numeric course IDs only.';
$string['courseenablementmoved'] = 'Process Feedback course options are now managed from course settings.';
$string['processfeedback:configure'] = 'Configure Process Feedback site settings';
$string['processfeedback:use'] = 'Use Process Feedback';
$string['processfeedback:viewreports'] = 'View Process Feedback reports';
$string['processfeedback:capture'] = 'Capture own activity text snapshots (deprecated)';
$string['captureintro'] = 'Process Feedback capture';
$string['capturenoticecapture'] = 'Process Feedback captures typing snapshots locally in this browser for this activity.';
$string['capturenoticeexport'] = 'The snapshots stay in browser storage unless you export them as a ZIP file.';
$string['downloadzip'] = 'Download Process Data';
$string['reportbuttonlabel'] = 'My Writing Process Report';
$string['paneldescription'] = 'Your writing process is tracked on this device so you can explore or share it.';
$string['learnmore'] = 'Learn more';
$string['teachernotice_assign'] = 'Students can see their writing process in this course\'s assignments. {$a}';
$string['teachernotice_assign_form'] = 'Students can see their writing process in this course\'s assignments. Auto submission of the writing process reports can be enabled or disabled for this assignment. {$a}';
$string['teachernotice_forum'] = 'Students can see their writing process in this course\'s forums. {$a}';
$string['teachernotice_forum_form'] = 'Students can see their writing process in this course\'s forums. {$a}';
$string['downloadbuttontitleintro'] = 'Process Feedback tracks revision snapshots while you edit this Moodle text.';
$string['downloadbuttontitleaction'] = 'Download the captured revisions as a ZIP file for Process Feedback exploration.';
$string['downloadbuttontitlerevision'] = 'Current revision: {$a}.';
$string['savedrevision'] = 'Revision captured.';
$string['typingready'] = 'Capture active';
$string['downloadready'] = 'ZIP export ready.';
$string['downloadempty'] = 'No revisions are available for this activity in this browser.';
$string['zipcreatefailed'] = 'Process Feedback could not create the ZIP in this browser.';
$string['zipreadmegenerated'] = 'This writing process data contains edit history and was generated by the Process Feedback Moodle plugin.';
$string['zipreadmedata'] = 'Handle this file according to the policies of the institution or the person who owns the data.';
$string['zipreadmepolicy'] = 'To explore the writing process report, upload the ZIP file at https://app.processfeedback.org/exploreprocess';
$string['capturefailed'] = 'Process Feedback capture failed in this browser.';
$string['storageupdatefailed'] = 'Process Feedback could not update local browser storage.';
$string['untitledtask'] = 'Untitled activity';
$string['untitledcourse'] = 'Untitled course';
$string['exportmodaltitle'] = 'Writing Process Report';
$string['exportmodalsubtitle'] = 'To view writing process report, first download process data ZIP file';
$string['exportfieldtitle'] = 'Title for this work';
$string['exportfieldname'] = 'Your name';
$string['exportfieldinstitution'] = 'Institution';
$string['exportfieldemail'] = 'Email';
$string['exportclose'] = 'Close';
$string['exportprocessdata'] = 'Process Data';
$string['exportopenreportbutton'] = 'Open Report';
$string['exportpackagingtitle'] = 'Packaging process data';
$string['exportstepsready'] = 'Choose an action to start processing the writing process report.';
$string['exportstepqueued'] = 'Queued';
$string['exportsteprunning'] = 'Running';
$string['exportstepdone'] = 'Done';
$string['exportsteperror'] = 'Error';
$string['exportstepopenreport'] = 'Opening the report explorer tab.';
$string['exportstepopenreportdetail'] = 'Opening a blank tab now so the browser does not block the report explorer.';
$string['exportstepcapture'] = 'Capturing the latest writing revision.';
$string['exportstepcapturedetail'] = 'Checking the current editor text and saving it if it changed.';
$string['exportsteppaste'] = 'Saving pending paste activity.';
$string['exportsteppastedetail'] = 'Writing any queued paste events into browser storage.';
$string['exportstepcount'] = 'Counting available revisions.';
$string['exportstepcountdetail'] = 'Checking how many writing snapshots are available for this activity.';
$string['exportsteppull'] = 'Pulling revisions from browser storage.';
$string['exportsteppulldetail'] = 'Reading the saved revisions and paste activity from IndexedDB.';
$string['exportsteppayload'] = 'Structuring the report payload.';
$string['exportsteppayloaddetail'] = 'Formatting revisions, metadata, and activity details for Process Feedback.';
$string['exportstepzip'] = 'Building the process data ZIP.';
$string['exportstepzipdetail'] = 'Compressing process_data.json and the README into a ZIP file.';
$string['exportstepdownload'] = 'Starting the ZIP download.';
$string['exportstepdownloaddetail'] = 'Handing the ZIP file to the browser download manager.';
$string['exportsteptransfer'] = 'Sending the ZIP to the report explorer.';
$string['exporterrorpopupblocked'] = 'Could not open ProcessFeedback. Check whether pop-ups are blocked.';
$string['exporterrorexplorertimeout'] = 'ProcessFeedback did not become ready in time.';
$string['exportdownloadedtitle'] = 'Writing process data downloaded';
$string['exportdownloadedprefix'] = 'Once the download is complete, you can load it at';
$string['exportreportready'] = 'Report Ready in Opened tab.';
$string['exportopenreport'] = 'Process Feedback';
$string['reportdashboardbutton'] = 'Writing Process Dashboard';
$string['reportsinglebutton'] = 'Writing Process Report';
$string['reportbetabadge'] = '(BETA)';
$string['reportwaiting'] = 'Waiting for ProcessFeedback...';
$string['reportsendingrange'] = 'Sending {$a->start}-{$a->end} of {$a->total}...';
$string['reportsendingone'] = 'Sending 1 of 1...';
$string['reportdashboardopenedone'] = 'Opened dashboard with {$a} file';
$string['reportdashboardopenedmany'] = 'Opened dashboard with {$a} files';
$string['reportsingleopened'] = 'Report Opened';
$string['reportnozipfiles'] = 'No process data ZIP files are available on this page!';
$string['reportsendfailed'] = 'Could not send ZIPs!';
$string['reportfilesendfailed'] = 'File sending failed!';
$string['reporterrorpopupblocked'] = 'Could not open ProcessFeedback. Check whether pop-ups are blocked.';
$string['savingprocessdata'] = 'Saving process data...';
$string['pluginnotenabled'] = 'Process Feedback is disabled by the site administrator.';
$string['processfeedbackprivacy_notice'] = 'Process Feedback may temporarily store activity process data in this browser for this activity.';
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
$string['uploaderroraccessdenied'] = 'You do not have permission to upload Process Feedback data for this activity.';
$string['uploaderrorcode'] = 'Process Feedback upload failed with upload error code {$a}.';
$string['uploaderrorcontextmismatch'] = 'The upload context does not match this assignment.';
$string['uploaderrorinvalidcontext'] = 'Process Feedback requires a valid activity context.';
$string['uploaderrorinvalidfilename'] = 'The uploaded Process Feedback filename is invalid.';
$string['uploaderrornofile'] = 'No valid Process Feedback file was uploaded.';
$string['uploaderrorsubmissionplugin'] = 'The Process Feedback assignment submission plugin is not enabled for this assignment.';
$string['uploaderrorunexpected'] = 'Process Feedback could not save the uploaded data.';
