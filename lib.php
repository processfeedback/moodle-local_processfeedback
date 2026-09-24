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
 * Legacy callback bridge for the Process Feedback local plugin.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Process Feedback course settings are managed by Moodle course custom fields.
 *
 * @param navigation_node $parentnode Course navigation node.
 * @param stdClass $course Course record.
 * @param context_course $context Course context.
 * @return void
 */
function local_processfeedback_extend_navigation_course(
    navigation_node $parentnode,
    stdClass $course,
    context_course $context
): void {
    return;
}

/**
 * Add the Process Feedback teacher notice to assignment and forum settings forms.
 *
 * @param moodleform_mod $formwrapper Course module form wrapper.
 * @param MoodleQuickForm $mform Course module settings form.
 * @return void
 */
function local_processfeedback_coursemodule_standard_elements($formwrapper, MoodleQuickForm $mform): void {

    if (during_initial_install() || !get_config('local_processfeedback', 'version')) {
        return;
    }

    if (!empty($GLOBALS['local_processfeedback_teacher_notice_added'])) {
        return;
    }

    $modname = local_processfeedback_get_coursemodule_form_modname($formwrapper);
    if (!in_array($modname, ['assign', 'forum'], true)) {
        return;
    }

    $course   = $formwrapper->get_course();
    $courseid = (int) ($course->id ?? 0);
    if ($courseid <= 0 || !\local_processfeedback\local\config::is_activity_enabled($modname, $courseid)) {
        return;
    }

    $coursecontext = \context_course::instance($courseid);
    if (!local_processfeedback_can_view_teacher_notice($coursecontext)) {
        return;
    }

    $learnmore = \html_writer::link(
        new \moodle_url('https://processfeedback.org/moodle-plugin-for-teachers'),
        get_string('learnmore', 'local_processfeedback'),
        ['target' => '_blank', 'rel' => 'noopener noreferrer']
    );

    \core\notification::add(
        get_string('teachernotice_' . $modname . '_form', 'local_processfeedback', $learnmore),
        \core\output\notification::NOTIFY_INFO,
        false
    );

    $GLOBALS['local_processfeedback_teacher_notice_added'] = true;
}

/**
 * Whether the current course user should see the teacher notice.
 *
 * @param context_course $context Course context.
 * @return bool
 */
function local_processfeedback_can_view_teacher_notice(context_course $context): bool {
    return has_capability('moodle/course:update', $context) ||
        has_capability('moodle/course:manageactivities', $context) ||
        has_capability('moodle/grade:viewall', $context);
}

/**
 * Get the module name from a course module form wrapper.
 *
 * @param moodleform_mod $formwrapper Course module form wrapper.
 * @return string Moodle module name, or an empty string when it cannot be detected.
 */
function local_processfeedback_get_coursemodule_form_modname($formwrapper): string {
    $current = $formwrapper->get_current();
    $modname = (string) ($current->modulename ?? $current->add ?? '');
    if ($modname !== '') {
        return $modname;
    }

    if (preg_match('/^mod_([^_]+)_mod_form$/', get_class($formwrapper), $matches)) {
        return $matches[1];
    }

    return '';
}
