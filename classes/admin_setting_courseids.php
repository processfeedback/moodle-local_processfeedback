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

namespace local_processfeedback;

use local_processfeedback\local\config;

/**
 * Admin setting for the Process Feedback enabled course allow-list.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class admin_setting_courseids extends \admin_setting_configtextarea {
    /** @var string Moodle activity module name to sync, or empty for validation only. */
    private $modname;

    /**
     * Constructor.
     *
     * @param string $name Setting name.
     * @param string|\lang_string $visiblename Setting display name.
     * @param string|\lang_string $description Setting description.
     * @param mixed $defaultsetting Default setting value.
     * @param string $paramtype Parameter type.
     * @param string $cols Textarea columns.
     * @param string $rows Textarea rows.
     * @param string $modname Moodle activity module name to sync.
     */
    public function __construct(
        $name,
        $visiblename,
        $description,
        $defaultsetting,
        $paramtype = PARAM_RAW,
        $cols = '60',
        $rows = '8',
        string $modname = ''
    ) {
        parent::__construct($name, $visiblename, $description, $defaultsetting, $paramtype, $cols, $rows);
        $this->modname = $modname;
    }

    /**
     * Validate, normalise, and save the configured course IDs.
     *
     * @param string $data Submitted setting value.
     * @return string Empty string on success, or an error message.
     */
    public function write_setting($data) {
        $rawcourseids = (string) $data;

        if (config::has_invalid_courseid_tokens($rawcourseids)) {
            return get_string('enabledcourseids_invalidformat', 'local_processfeedback');
        }

        $normalised = config::normalise_courseids($rawcourseids);

        if ($normalised !== '' && !config::courseids_exist($normalised)) {
            return get_string('enabledcourseids_invalid', 'local_processfeedback');
        }

        $result = parent::write_setting($normalised);
        if ($result === '' && $this->modname !== '') {
            \local_processfeedback\local\course_settings::sync_site_setting_to_course_values($this->modname, $normalised);
        }

        return $result;
    }
}
