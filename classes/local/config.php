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

namespace local_processfeedback\local;

/**
 * Configuration helpers for Process Feedback availability decisions.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class config {
    /** @var string Plugin component name. */
    private const COMPONENT = 'local_processfeedback';

    /** @var array Site settings for courses where activity support may be enabled. */
    private const ACTIVITY_COURSEIDS_SETTINGS = [
        'assign' => 'enabledassignmentincourseids',
        'forum' => 'enabledforumsincourseids',
    ];

    /**
     * Whether Process Feedback is enabled for a supported activity module.
     *
     * @param string $modname Activity module name.
     * @param int $courseid Course ID.
     * @return bool
     */
    public static function is_activity_enabled(string $modname, int $courseid = 0): bool {
        if ($courseid <= 0) {
            return false;
        }

        if ($modname === 'assign') {
            return self::is_course_allowed_for_activity($modname, $courseid) &&
                course_settings::assignments_enabled_for_course($courseid);
        }

        if ($modname === 'forum') {
            return self::is_course_allowed_for_activity($modname, $courseid) &&
                course_settings::forums_enabled_for_course($courseid);
        }

        return false;
    }

    /**
     * Normalise a course ID list to a sorted comma-separated string.
     *
     * @param string $value Raw configured value.
     * @return string Normalised positive course IDs.
     */
    public static function normalise_courseids(string $value): string {
        $parts = preg_split('/[\s,]+/', trim($value), -1, PREG_SPLIT_NO_EMPTY);

        if (empty($parts)) {
            return '';
        }

        $courseids = [];
        foreach ($parts as $part) {
            if (!ctype_digit($part)) {
                continue;
            }

            $courseid = (int) $part;
            if ($courseid > 0) {
                $courseids[$courseid] = $courseid;
            }
        }

        ksort($courseids, SORT_NUMERIC);

        return implode(',', $courseids);
    }

    /**
     * Whether the raw course ID setting contains invalid tokens.
     *
     * @param string $value Raw configured value.
     * @return bool
     */
    public static function has_invalid_courseid_tokens(string $value): bool {
        $parts = preg_split('/[\s,]+/', trim($value), -1, PREG_SPLIT_NO_EMPTY);

        if (empty($parts)) {
            return false;
        }

        foreach ($parts as $part) {
            if (!ctype_digit($part) || (int) $part <= 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check whether all normalised course IDs exist.
     *
     * @param string $normalisedcourseids Normalised comma-separated course IDs.
     * @return bool
     */
    public static function courseids_exist(string $normalisedcourseids): bool {
        global $DB;

        if ($normalisedcourseids === '') {
            return true;
        }

        $courseids = array_map('intval', explode(',', $normalisedcourseids));
        $courseids = array_values(array_filter($courseids, static fn(int $id): bool => $id > 0));

        if (empty($courseids)) {
            return true;
        }

        [$insql, $params] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED);
        $existing = $DB->count_records_select('course', "id {$insql}", $params);

        return $existing === count($courseids);
    }

    /**
     * Get the site setting name that stores course IDs for an activity.
     *
     * @param string $modname Moodle activity module name.
     * @return string|null
     */
    public static function get_activity_courseids_setting(string $modname): ?string {
        return self::ACTIVITY_COURSEIDS_SETTINGS[$modname] ?? null;
    }

    /**
     * Get configured course IDs for an activity.
     *
     * @param string $modname Moodle activity module name.
     * @return int[]
     */
    public static function get_activity_courseids(string $modname): array {
        $setting = self::get_activity_courseids_setting($modname);
        if ($setting === null) {
            return [];
        }

        return self::get_courseids_from_setting($setting);
    }

    /**
     * Whether a course ID is included in an activity's site allow-list.
     *
     * @param string $modname Moodle activity module name.
     * @param int $courseid Course ID.
     * @return bool
     */
    public static function is_course_allowed_for_activity(string $modname, int $courseid): bool {
        return in_array($courseid, self::get_activity_courseids($modname), true);
    }

    /**
     * Add or remove a course ID in an activity's site allow-list.
     *
     * @param string $modname Moodle activity module name.
     * @param int $courseid Course ID.
     * @param bool $allowed Whether the course should be present in the allow-list.
     * @return void
     */
    public static function set_course_allowed_for_activity(string $modname, int $courseid, bool $allowed): void {
        if ($courseid <= 0) {
            return;
        }

        $setting = self::get_activity_courseids_setting($modname);
        if ($setting === null) {
            return;
        }

        $courseids = self::get_courseids_from_setting($setting);
        $courseids = array_combine($courseids, $courseids) ?: [];

        if ($allowed) {
            $courseids[$courseid] = $courseid;
        } else {
            unset($courseids[$courseid]);
        }

        ksort($courseids, SORT_NUMERIC);
        set_config($setting, implode(',', $courseids), self::COMPONENT);
    }

    /**
     * Get normalised course IDs from a plugin setting.
     *
     * @param string $setting Setting name.
     * @return int[]
     */
    private static function get_courseids_from_setting(string $setting): array {
        $value = get_config(self::COMPONENT, $setting);

        if (empty($value)) {
            return [];
        }

        $normalised = self::normalise_courseids((string) $value);

        if ($normalised === '') {
            return [];
        }

        return array_map('intval', explode(',', $normalised));
    }

}
