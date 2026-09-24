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
 * Admin settings for the Process Feedback local plugin.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage(
        'local_processfeedback_settings',
        new lang_string('settings', 'local_processfeedback')
    );

    if ($ADMIN->fulltree) {

        $settings->add(new \local_processfeedback\admin_setting_courseids(
            'local_processfeedback/enabledassignmentincourseids',
            new lang_string('enabledassignmentincourseids', 'local_processfeedback'),
            new lang_string('enabledassignmentincourseids_desc', 'local_processfeedback'),
            '',
            PARAM_RAW_TRIMMED,
            '60',
            '8',
            'assign'
        ));

        $settings->add(new \local_processfeedback\admin_setting_courseids(
            'local_processfeedback/enabledforumsincourseids',
            new lang_string('enabledforumsincourseids', 'local_processfeedback'),
            new lang_string('enabledforumsincourseids_desc', 'local_processfeedback'),
            '',
            PARAM_RAW_TRIMMED,
            '60',
            '8',
            'forum'
        ));
    }

    $ADMIN->add('localplugins', $settings);
}
