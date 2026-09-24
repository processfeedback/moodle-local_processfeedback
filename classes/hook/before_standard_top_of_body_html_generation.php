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

namespace local_processfeedback\hook;

use local_processfeedback\local\config;

/**
 * Adds the Process Feedback teacher notice when viewing assignment or forum activities.
 *
 * Handles view pages only (mod/assign/view.php, mod/forum/view.php, grading, etc).
 * The create/edit form notice is handled separately by
 * local_processfeedback_coursemodule_standard_elements() in lib.php.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class before_standard_top_of_body_html_generation {
    /** @var string Learn More URL shown in Process Feedback notices. */
    private const LEARN_MORE_URL = 'https://processfeedback.org/moodle-plugin-for-teachers';

    /**
     * Queue the teacher notice when viewing an assignment or forum activity page.
     *
     * @param \core\hook\output\before_standard_top_of_body_html_generation $hook The output hook.
     * @return void
     */
    public static function callback(\core\hook\output\before_standard_top_of_body_html_generation $hook): void {
        global $PAGE;

        if (during_initial_install() || !get_config('local_processfeedback', 'version')) {
            return;
        }
        
        // Only fire on module context pages (assign/forum view, grading, etc).
        // modedit.php create/edit forms are handled by coursemodule_standard_elements() in lib.php.
        $context = $PAGE->context;
        if (!$context || $context->contextlevel !== CONTEXT_MODULE) {
            return;
        }

        // Match only the main view pages: mod-assign-view, mod-forum-view.
        // Exclude grading, grader (speed grader), discuss, and other sub-pages.
        // Settings forms (modedit.php) are handled by coursemodule_standard_elements() in lib.php.
        if (!preg_match('/^mod-(assign|forum)-view$/', (string) $PAGE->pagetype, $matches)) {
            return;
        }
        $modname = $matches[1];

        // Get course ID reliably from the module context.
        $cm = get_coursemodule_from_id($modname, (int) $context->instanceid, 0, false, IGNORE_MISSING);
        if (!$cm) {
            return;
        }
        $courseid = (int) $cm->course;

        if ($courseid <= 0 || !config::is_activity_enabled($modname, $courseid)) {
            return;
        }

        $coursecontext = \context_course::instance($courseid, IGNORE_MISSING);
        if (!$coursecontext || !self::can_view_teacher_notice($coursecontext)) {
            return;
        }

        $learnmore = \html_writer::link(
            new \moodle_url(self::LEARN_MORE_URL),
            get_string('learnmore', 'local_processfeedback'),
            ['target' => '_blank', 'rel' => 'noopener noreferrer']
        );

        \core\notification::add(
            get_string('teachernotice_' . $modname, 'local_processfeedback', $learnmore),
            \core\output\notification::NOTIFY_INFO
        );
    }

    /**
     * Whether the current user should see the teacher notice.
     *
     * @param \context_course $context Course context.
     * @return bool
     */
    private static function can_view_teacher_notice(\context_course $context): bool {
        return has_capability('moodle/course:update', $context) ||
            has_capability('moodle/course:manageactivities', $context) ||
            has_capability('moodle/grade:viewall', $context);
    }
}