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
 * Direct file upload endpoint for Process Feedback local plugin.
 *
 * Accepts a single file POST and stores it in the user's draft file area
 * under the given draftitemid. Called by the assignment submission interceptor
 * before the student's form is released.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->dirroot . '/mod/assign/locallib.php');

require_sesskey();

header('Content-Type: application/json');

/**
 * Return a localized AJAX upload error and stop execution.
 *
 * @param string $identifier Language string identifier.
 * @param int|null $a Optional language string data.
 * @return void
 */
function local_processfeedback_upload_error_response(string $identifier, ?int $a = null): void {
    echo json_encode(['error' => get_string($identifier, 'local_processfeedback', $a)]);
    die;
}

try {
    $draftitemid = optional_param('draftitemid', 0, PARAM_INT);
    $contextid = required_param('contextid', PARAM_INT);
    $cmid = required_param('cmid', PARAM_INT);

    $context = context::instance_by_id($contextid);
    if ($context->contextlevel !== CONTEXT_MODULE) {
        local_processfeedback_upload_error_response('uploaderrorinvalidcontext');
    }

    $cm = get_coursemodule_from_id('assign', $cmid, 0, false, MUST_EXIST);
    $modulecontext = context_module::instance($cm->id);
    if ((int) $modulecontext->id !== (int) $context->id) {
        local_processfeedback_upload_error_response('uploaderrorcontextmismatch');
    }

    $course = get_course($cm->course);
    require_login($course, false, $cm);

    if (!\local_processfeedback\local\config::is_activity_enabled('assign', (int) $course->id)) {
        local_processfeedback_upload_error_response('uploaderroraccessdenied');
    }

    if (!\local_processfeedback\local\access::can_use_context($modulecontext)) {
        local_processfeedback_upload_error_response('uploaderroraccessdenied');
    }

    $assignment = new assign($modulecontext, $cm, $course);
    $submissionplugin = $assignment->get_submission_plugin_by_type('processfeedback');
    if (
        !$submissionplugin ||
            !$submissionplugin->is_enabled() ||
            !$submissionplugin->is_visible() ||
            !$submissionplugin->allow_submissions()
    ) {
        local_processfeedback_upload_error_response('uploaderrorsubmissionplugin');
    }

    if (empty($_FILES['file']['tmp_name']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        local_processfeedback_upload_error_response('uploaderrornofile');
    }

    if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        local_processfeedback_upload_error_response('uploaderrorcode', (int) $_FILES['file']['error']);
    }

    $filename = clean_param($_FILES['file']['name'], PARAM_FILE);
    if (empty($filename)) {
        local_processfeedback_upload_error_response('uploaderrorinvalidfilename');
    }

    if ($draftitemid <= 0) {
        $draftitemid = file_get_unused_draft_itemid();
    }

    $tmpfile = $_FILES['file']['tmp_name'];
    $context = context_user::instance($USER->id);
    $fs = get_file_storage();

    // Remove any existing file with the same name in this draft area.
    $existing = $fs->get_file($context->id, 'user', 'draft', $draftitemid, '/', $filename);
    if ($existing) {
        $existing->delete();
    }

    $filerecord = [
        'contextid' => $context->id,
        'component' => 'user',
        'filearea'  => 'draft',
        'itemid'    => $draftitemid,
        'filepath'  => '/',
        'filename'  => $filename,
        'userid'    => $USER->id,
    ];

    $storedfile = $fs->create_file_from_pathname($filerecord, $tmpfile);

    echo json_encode([
        'success'  => true,
        'itemid'   => $draftitemid,
        'filename' => $filename,
        'filesize' => $storedfile->get_filesize(),
    ]);
} catch (Exception $e) {
    local_processfeedback_upload_error_response('uploaderrorunexpected');
}
