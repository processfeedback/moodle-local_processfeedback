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

namespace local_processfeedback\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use local_processfeedback\local\config;

/**
 * Returns runtime data needed by the Process Feedback JavaScript UI.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class get_bootstrap_data extends external_api {
    /** @var int Default text snapshot interval in milliseconds. */
    private const SNAPSHOT_INTERVAL_MS = 5000;

    /** @var string[] Supported Moodle activity modules. */
    private const SUPPORTED_MODULES = ['assign', 'forum'];

    /**
     * Describe accepted AJAX parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context ID'),
            'cmid' => new external_value(PARAM_INT, 'Course module ID', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Return runtime data for the current user and supported module context.
     *
     * @param int $contextid Context ID.
     * @param int $cmid Course module ID.
     * @return array
     */
    public static function execute(int $contextid, int $cmid = 0): array {
        global $SITE, $USER;

        [
            'contextid' => $contextid,
            'cmid' => $cmid,
        ] = self::validate_parameters(self::execute_parameters(), [
            'contextid' => $contextid,
            'cmid' => $cmid,
        ]);

        $context = \context::instance_by_id($contextid);
        self::validate_context($context);

        if ($context->contextlevel !== CONTEXT_MODULE) {
            throw new \invalid_parameter_exception('Process Feedback requires a module context.');
        }

        $cmid = $cmid ?: (int) $context->instanceid;
        $cm = null;
        foreach (self::SUPPORTED_MODULES as $supportedmodule) {
            $cm = get_coursemodule_from_id($supportedmodule, $cmid, 0, false, IGNORE_MISSING);
            if ($cm) {
                break;
            }
        }
        if (!$cm) {
            throw new \invalid_parameter_exception('Process Feedback requires a supported activity module.');
        }
        $modulecontext = \context_module::instance($cm->id);

        if ((int) $modulecontext->id !== (int) $context->id) {
            throw new \invalid_parameter_exception('Context does not match the course module.');
        }

        $course = get_course($cm->course);
        $coursecontext = \context_course::instance($course->id);
        require_login($course, false, $cm);

        $activityenabled = config::is_activity_enabled((string) $cm->modname, (int) $course->id);
        $canuse = $activityenabled && has_capability('local/processfeedback:use', $modulecontext);
        $canexportprocessdata = $canuse && !has_capability('local/processfeedback:viewreports', $coursecontext);
        $captureallowed = $activityenabled && $canuse;
        $projectid = implode(':', [
            'local_processfeedback',
            (int) $USER->id,
            (int) $course->id,
            (int) $cm->id,
        ]);

        $activitytitle = $canuse ? format_string($cm->name, true, ['context' => $context]) : '';

        return [
            'enabled' => $activityenabled && $canuse,
            'captureallowed' => $captureallowed,
            'captureenabledbydefault' => $activityenabled,
            'contextenabled' => $activityenabled,
            'canuse' => $canuse,
            'canexportprocessdata' => $canexportprocessdata,
            'contextid' => (int) $context->id,
            'courseid' => (int) $course->id,
            'coursename' => $canuse ? format_string($course->fullname, true, ['context' => $context]) : '',
            'cmid' => (int) $cm->id,
            'modname' => (string) $cm->modname,
            'activityinstanceid' => (int) $cm->instance,
            'activitytitle' => $activitytitle,
            'assignmentinstanceid' => (int) $cm->instance,
            'assignmenttitle' => $activitytitle,
            'sitename' => $canuse ? format_string($SITE->fullname ?? '', true) : '',
            'userid' => (int) $USER->id,
            'userfullname' => $canuse ? fullname($USER) : '',
            'useremail' => $canuse ? (string) ($USER->email ?? '') : '',
            'projectid' => $projectid,
            'snapshotinterval' => self::SNAPSHOT_INTERVAL_MS,
            'compresssnapshots' => false,
            'strings' => [
                'captureintro' => get_string('captureintro', 'local_processfeedback'),
                'downloadzip' => get_string('downloadzip', 'local_processfeedback'),
                'reportbuttonlabel' => get_string('reportbuttonlabel', 'local_processfeedback'),
                'paneldescription' => get_string('paneldescription', 'local_processfeedback'),
                'learnmore' => get_string('learnmore', 'local_processfeedback'),
                'downloadbuttontitleintro' => get_string('downloadbuttontitleintro', 'local_processfeedback'),
                'downloadbuttontitleaction' => get_string('downloadbuttontitleaction', 'local_processfeedback'),
                'downloadbuttontitlerevision' => get_string('downloadbuttontitlerevision', 'local_processfeedback', '__COUNT__'),
                'savedrevision' => get_string('savedrevision', 'local_processfeedback'),
                'typingready' => get_string('typingready', 'local_processfeedback'),
                'downloadready' => get_string('downloadready', 'local_processfeedback'),
                'downloadempty' => get_string('downloadempty', 'local_processfeedback'),
                'zipcreatefailed' => get_string('zipcreatefailed', 'local_processfeedback'),
                'zipreadmegenerated' => get_string('zipreadmegenerated', 'local_processfeedback'),
                'zipreadmedata' => get_string('zipreadmedata', 'local_processfeedback'),
                'zipreadmepolicy' => get_string('zipreadmepolicy', 'local_processfeedback'),
                'capturefailed' => get_string('capturefailed', 'local_processfeedback'),
                'storageupdatefailed' => get_string('storageupdatefailed', 'local_processfeedback'),
                'untitledtask' => get_string('untitledtask', 'local_processfeedback'),
                'untitledcourse' => get_string('untitledcourse', 'local_processfeedback'),
                'exportmodaltitle' => get_string('exportmodaltitle', 'local_processfeedback'),
                'exportmodalsubtitle' => get_string('exportmodalsubtitle', 'local_processfeedback'),
                'exportfieldtitle' => get_string('exportfieldtitle', 'local_processfeedback'),
                'exportfieldname' => get_string('exportfieldname', 'local_processfeedback'),
                'exportfieldinstitution' => get_string('exportfieldinstitution', 'local_processfeedback'),
                'exportfieldemail' => get_string('exportfieldemail', 'local_processfeedback'),
                'exportclose' => get_string('exportclose', 'local_processfeedback'),
                'exportprocessdata' => get_string('exportprocessdata', 'local_processfeedback'),
                'exportopenreportbutton' => get_string('exportopenreportbutton', 'local_processfeedback'),
                'exportpackagingtitle' => get_string('exportpackagingtitle', 'local_processfeedback'),
                'exportstepsready' => get_string('exportstepsready', 'local_processfeedback'),
                'exportstepqueued' => get_string('exportstepqueued', 'local_processfeedback'),
                'exportsteprunning' => get_string('exportsteprunning', 'local_processfeedback'),
                'exportstepdone' => get_string('exportstepdone', 'local_processfeedback'),
                'exportsteperror' => get_string('exportsteperror', 'local_processfeedback'),
                'exportstepopenreport' => get_string('exportstepopenreport', 'local_processfeedback'),
                'exportstepopenreportdetail' => get_string('exportstepopenreportdetail', 'local_processfeedback'),
                'exportstepcapture' => get_string('exportstepcapture', 'local_processfeedback'),
                'exportstepcapturedetail' => get_string('exportstepcapturedetail', 'local_processfeedback'),
                'exportsteppaste' => get_string('exportsteppaste', 'local_processfeedback'),
                'exportsteppastedetail' => get_string('exportsteppastedetail', 'local_processfeedback'),
                'exportstepcount' => get_string('exportstepcount', 'local_processfeedback'),
                'exportstepcountdetail' => get_string('exportstepcountdetail', 'local_processfeedback'),
                'exportsteppull' => get_string('exportsteppull', 'local_processfeedback'),
                'exportsteppulldetail' => get_string('exportsteppulldetail', 'local_processfeedback'),
                'exportsteppayload' => get_string('exportsteppayload', 'local_processfeedback'),
                'exportsteppayloaddetail' => get_string('exportsteppayloaddetail', 'local_processfeedback'),
                'exportstepzip' => get_string('exportstepzip', 'local_processfeedback'),
                'exportstepzipdetail' => get_string('exportstepzipdetail', 'local_processfeedback'),
                'exportstepdownload' => get_string('exportstepdownload', 'local_processfeedback'),
                'exportstepdownloaddetail' => get_string('exportstepdownloaddetail', 'local_processfeedback'),
                'exportsteptransfer' => get_string('exportsteptransfer', 'local_processfeedback'),
                'exporterrorpopupblocked' => get_string('exporterrorpopupblocked', 'local_processfeedback'),
                'exporterrorexplorertimeout' => get_string('exporterrorexplorertimeout', 'local_processfeedback'),
                'exportdownloadedtitle' => get_string('exportdownloadedtitle', 'local_processfeedback'),
                'exportdownloadedprefix' => get_string('exportdownloadedprefix', 'local_processfeedback'),
                'exportreportready' => get_string('exportreportready', 'local_processfeedback'),
                'exportopenreport' => get_string('exportopenreport', 'local_processfeedback'),
                'savingprocessdata' => get_string('savingprocessdata', 'local_processfeedback'),
                'processfeedbackprivacynotice' => get_string('processfeedbackprivacy_notice', 'local_processfeedback'),
            ],
        ];
    }

    /**
     * Describe returned AJAX data.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'enabled' => new external_value(PARAM_BOOL, 'Whether Process Feedback is enabled'),
            'captureallowed' => new external_value(PARAM_BOOL, 'Whether browser-local capture is allowed'),
            'captureenabledbydefault' => new external_value(PARAM_BOOL, 'Whether capture is enabled by default'),
            'contextenabled' => new external_value(PARAM_BOOL, 'Whether Process Feedback is enabled for this context'),
            'canuse' => new external_value(PARAM_BOOL, 'Whether the current user can use Process Feedback'),
            'canexportprocessdata' => new external_value(PARAM_BOOL, 'Whether the current user can export process data'),
            'contextid' => new external_value(PARAM_INT, 'Context ID'),
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'coursename' => new external_value(PARAM_TEXT, 'Course name'),
            'cmid' => new external_value(PARAM_INT, 'Course module ID'),
            'modname' => new external_value(PARAM_PLUGIN, 'Activity module name'),
            'activityinstanceid' => new external_value(PARAM_INT, 'Activity instance ID'),
            'activitytitle' => new external_value(PARAM_TEXT, 'Activity title'),
            'assignmentinstanceid' => new external_value(PARAM_INT, 'Legacy activity instance ID'),
            'assignmenttitle' => new external_value(PARAM_TEXT, 'Legacy activity title'),
            'sitename' => new external_value(PARAM_TEXT, 'Site name'),
            'userid' => new external_value(PARAM_INT, 'Current user ID'),
            'userfullname' => new external_value(PARAM_TEXT, 'Current user full name'),
            'useremail' => new external_value(PARAM_EMAIL, 'Current user email address', VALUE_DEFAULT, ''),
            'projectid' => new external_value(PARAM_TEXT, 'Process Feedback project ID'),
            'snapshotinterval' => new external_value(PARAM_INT, 'Snapshot interval in milliseconds'),
            'compresssnapshots' => new external_value(PARAM_BOOL, 'Whether snapshots should be compressed for export'),
            'strings' => new external_single_structure([
                'captureintro' => new external_value(PARAM_TEXT, 'Capture panel label'),
                'downloadzip' => new external_value(PARAM_TEXT, 'Download button label'),
                'reportbuttonlabel' => new external_value(PARAM_TEXT, 'Report button label'),
                'paneldescription' => new external_value(PARAM_TEXT, 'Process panel description'),
                'learnmore' => new external_value(PARAM_TEXT, 'Learn-more link label'),
                'downloadbuttontitleintro' => new external_value(PARAM_TEXT, 'Download button title introduction'),
                'downloadbuttontitleaction' => new external_value(PARAM_TEXT, 'Download button title action'),
                'downloadbuttontitlerevision' => new external_value(PARAM_TEXT, 'Download button title revision count'),
                'savedrevision' => new external_value(PARAM_TEXT, 'Saved revision status'),
                'typingready' => new external_value(PARAM_TEXT, 'Typing-ready capture status'),
                'downloadready' => new external_value(PARAM_TEXT, 'Download ready status'),
                'downloadempty' => new external_value(PARAM_TEXT, 'Download empty status'),
                'zipcreatefailed' => new external_value(PARAM_TEXT, 'ZIP creation failure status'),
                'zipreadmegenerated' => new external_value(PARAM_TEXT, 'ZIP readme generated-by text'),
                'zipreadmedata' => new external_value(PARAM_TEXT, 'ZIP readme data warning'),
                'zipreadmepolicy' => new external_value(PARAM_TEXT, 'ZIP readme policy warning'),
                'capturefailed' => new external_value(PARAM_TEXT, 'Capture failed status'),
                'storageupdatefailed' => new external_value(PARAM_TEXT, 'Storage update failed status'),
                'untitledtask' => new external_value(PARAM_TEXT, 'Fallback activity title'),
                'untitledcourse' => new external_value(PARAM_TEXT, 'Fallback course name'),
                'exportmodaltitle' => new external_value(PARAM_TEXT, 'Export modal title'),
                'exportmodalsubtitle' => new external_value(PARAM_TEXT, 'Export modal subtitle'),
                'exportfieldtitle' => new external_value(PARAM_TEXT, 'Export work title detail label'),
                'exportfieldname' => new external_value(PARAM_TEXT, 'Export user name detail label'),
                'exportfieldinstitution' => new external_value(PARAM_TEXT, 'Export institution detail label'),
                'exportfieldemail' => new external_value(PARAM_TEXT, 'Export email detail label'),
                'exportclose' => new external_value(PARAM_TEXT, 'Export modal close button label'),
                'exportprocessdata' => new external_value(PARAM_TEXT, 'Export process-data button label'),
                'exportopenreportbutton' => new external_value(PARAM_TEXT, 'Export open-report button label'),
                'exportpackagingtitle' => new external_value(PARAM_TEXT, 'Export packaging progress title'),
                'exportstepsready' => new external_value(PARAM_TEXT, 'Export steps ready text'),
                'exportstepqueued' => new external_value(PARAM_TEXT, 'Export queued step status'),
                'exportsteprunning' => new external_value(PARAM_TEXT, 'Export running step status'),
                'exportstepdone' => new external_value(PARAM_TEXT, 'Export done step status'),
                'exportsteperror' => new external_value(PARAM_TEXT, 'Export error step status'),
                'exportstepopenreport' => new external_value(PARAM_TEXT, 'Export open report step label'),
                'exportstepopenreportdetail' => new external_value(PARAM_TEXT, 'Export open report step detail'),
                'exportstepcapture' => new external_value(PARAM_TEXT, 'Export capture step label'),
                'exportstepcapturedetail' => new external_value(PARAM_TEXT, 'Export capture step detail'),
                'exportsteppaste' => new external_value(PARAM_TEXT, 'Export paste step label'),
                'exportsteppastedetail' => new external_value(PARAM_TEXT, 'Export paste step detail'),
                'exportstepcount' => new external_value(PARAM_TEXT, 'Export revision count step label'),
                'exportstepcountdetail' => new external_value(PARAM_TEXT, 'Export revision count step detail'),
                'exportsteppull' => new external_value(PARAM_TEXT, 'Export pull step label'),
                'exportsteppulldetail' => new external_value(PARAM_TEXT, 'Export pull step detail'),
                'exportsteppayload' => new external_value(PARAM_TEXT, 'Export payload step label'),
                'exportsteppayloaddetail' => new external_value(PARAM_TEXT, 'Export payload step detail'),
                'exportstepzip' => new external_value(PARAM_TEXT, 'Export ZIP step label'),
                'exportstepzipdetail' => new external_value(PARAM_TEXT, 'Export ZIP step detail'),
                'exportstepdownload' => new external_value(PARAM_TEXT, 'Export download step label'),
                'exportstepdownloaddetail' => new external_value(PARAM_TEXT, 'Export download step detail'),
                'exportsteptransfer' => new external_value(PARAM_TEXT, 'Export report transfer step label'),
                'exporterrorpopupblocked' => new external_value(PARAM_TEXT, 'Export pop-up blocked error text'),
                'exporterrorexplorertimeout' => new external_value(PARAM_TEXT, 'Export explorer timeout error text'),
                'exportdownloadedtitle' => new external_value(PARAM_TEXT, 'Export downloaded success title'),
                'exportdownloadedprefix' => new external_value(PARAM_TEXT, 'Export downloaded success prefix'),
                'exportreportready' => new external_value(PARAM_TEXT, 'Export report-ready success text'),
                'exportopenreport' => new external_value(PARAM_TEXT, 'Export final call-to-action link text'),
                'savingprocessdata' => new external_value(PARAM_TEXT, 'Submission upload progress text'),
                'processfeedbackprivacynotice' => new external_value(PARAM_TEXT, 'Browser-local data privacy notice'),
            ], 'Localized UI strings'),
        ]);
    }
}
