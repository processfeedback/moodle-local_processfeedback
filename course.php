<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Legacy redirect for the removed course-level Process Feedback enablement action.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

$courseid = required_param('id', PARAM_INT);

$course = get_course($courseid);
if ((int) $course->id === SITEID) {
    throw new moodle_exception('invalidcourseid');
}

$context = context_course::instance($course->id);
$url = new moodle_url('/local/processfeedback/course.php', ['id' => $course->id]);
$settingsurl = new moodle_url('/course/edit.php', ['id' => $course->id]);

require_login($course);
require_capability('moodle/course:update', $context);

$PAGE->set_url($url);
$PAGE->set_context($context);
$PAGE->set_course($course);
$PAGE->set_title(get_string('settings', 'local_processfeedback'));
$PAGE->set_heading(format_string($course->fullname, true, ['context' => $context]));

redirect(
    $settingsurl,
    get_string('courseenablementmoved', 'local_processfeedback'),
    null,
    \core\output\notification::NOTIFY_INFO
);
