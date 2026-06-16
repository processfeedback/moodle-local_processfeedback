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

use local_processfeedback\local\access;
use local_processfeedback\local\config;
use local_processfeedback\local\teacher_notice;

/**
 * Loads the Process Feedback recorder on supported activity pages.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class before_footer_html_generation {
    /**
     * Register the recorder JavaScript on Moodle activity pages that can show process controls.
     *
     * @param \core\hook\output\before_footer_html_generation $hook The output hook.
     * @return void
     */
    public static function callback(\core\hook\output\before_footer_html_generation $hook): void {
        global $PAGE, $USER;

        if (during_initial_install() || !get_config('local_processfeedback', 'version')) {
            return;
        }

        $context = $PAGE->context;

        if (!$context || $context->contextlevel !== CONTEXT_MODULE) {
            return;
        }

        $cm = $PAGE->cm ?? null;
        if (!$cm) {
            return;
        }

        $modname = $cm->modname ?? '';
        $supportedmods = ['assign', 'forum'];
        if (!in_array($modname, $supportedmods, true)) {
            return;
        }

        $path = $PAGE->url ? $PAGE->url->get_path() : '';
        if (strpos($path, '/mod/' . $modname . '/') === false) {
            return;
        }

        if (!config::is_activity_enabled($modname, (int) $cm->course)) {
            return;
        }

        if (!access::can_use_context($context)) {
            return;
        }

        $hook->add_html(\html_writer::div('', '', ['id' => 'local-processfeedback-root']));

        $PAGE->requires->js_call_amd('local_processfeedback/main', 'init', [
            [
                'contextid' => (int) $context->id,
                'courseid' => (int) $cm->course,
                'cmid' => (int) $cm->id,
                'userid'        => (int) $USER->id,
                'rootselector' => '#local-processfeedback-root',
            ],
        ]);
    }
}
