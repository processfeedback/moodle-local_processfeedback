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
 * Course-level Process Feedback settings backed by Moodle course custom fields.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class course_settings {
    /** @var array Activity custom field definitions keyed by Moodle module name. */
    private const ACTIVITY_FIELDS = [
        'forum' => [
            'shortname' => 'processfeedbackforums',
            'name' => 'enableforumscourse',
            'description' => 'enableforumscourse_desc',
            'sortorder' => 0,
        ],
        'assign' => [
            'shortname' => 'processfeedbackassignments',
            'name' => 'enableassignmentscourse',
            'description' => 'enableassignmentscourse_desc',
            'sortorder' => 1,
        ],
    ];

    /** @var string Course custom field category name. */
    private const CATEGORY_NAME = 'Process Feedback';

    /**
     * Ensure the course custom fields used for activity enablement exist.
     *
     * @return void
     */
    public static function ensure_custom_fields(): void {
        foreach (array_keys(self::ACTIVITY_FIELDS) as $modname) {
            self::ensure_activity_custom_field($modname);
        }
    }

    /**
     * Ensure the course custom field used for assignment enablement exists.
     *
     * @return void
     */
    public static function ensure_assignments_custom_field(): void {
        self::ensure_activity_custom_field('assign');
    }

    /**
     * Ensure the course custom field used for forum enablement exists.
     *
     * @return void
     */
    public static function ensure_forums_custom_field(): void {
        self::ensure_activity_custom_field('forum');
    }

    /**
     * Ensure the course custom field used for an activity's enablement exists.
     *
     * @param string $modname Moodle activity module name.
     * @return void
     */
    private static function ensure_activity_custom_field(string $modname): void {
        if (!class_exists(\core_customfield\handler::class) ||
                !class_exists(\core_customfield\field_controller::class) ||
                !class_exists(\core_customfield\category_controller::class)) {
            return;
        }

        if (!isset(self::ACTIVITY_FIELDS[$modname])) {
            return;
        }

        $handler = \core_customfield\handler::get_handler('core_course', 'course');
        if (!array_key_exists('checkbox', $handler->get_available_field_types())) {
            return;
        }

        $fieldrecord = self::get_activity_field_record($modname, false);
        if ($fieldrecord) {
            self::update_activity_field($modname, $fieldrecord);
            return;
        }

        $categoryid = self::get_category_id();
        if (!$categoryid) {
            $categoryid = $handler->create_category(self::CATEGORY_NAME);
        }

        $category = \core_customfield\category_controller::create((int) $categoryid, null, $handler);
        $definition = self::ACTIVITY_FIELDS[$modname];
        $record = (object) [
            'type' => 'checkbox',
            'shortname' => $definition['shortname'],
            'name' => get_string($definition['name'], 'local_processfeedback'),
            'description' => '',
            'descriptionformat' => FORMAT_HTML,
            'sortorder' => $definition['sortorder'],
            'categoryid' => (int) $categoryid,
            'configdata' => self::activity_field_config_json(),
        ];

        $field = \core_customfield\field_controller::create(0, $record, $category);
        $field->save();
        self::clear_activity_field_record_cache($modname);
    }

    /**
     * Whether the course-level assignment setting is enabled.
     *
     * @param int $courseid Course ID.
     * @return bool
     */
    public static function assignments_enabled_for_course(int $courseid): bool {
        return self::activity_enabled_for_course('assign', $courseid);
    }

    /**
     * Whether the course-level forum setting is enabled.
     *
     * @param int $courseid Course ID.
     * @return bool
     */
    public static function forums_enabled_for_course(int $courseid): bool {
        return self::activity_enabled_for_course('forum', $courseid);
    }

    /**
     * Sync Process Feedback course field values into the matching site allow-lists.
     *
     * @param int $courseid Course ID.
     * @return void
     */
    public static function sync_course_to_site_settings(int $courseid): void {
        if ($courseid <= 0 || $courseid === SITEID) {
            return;
        }

        foreach (array_keys(self::ACTIVITY_FIELDS) as $modname) {
            config::set_course_allowed_for_activity($modname, $courseid, self::activity_enabled_for_course($modname, $courseid));
        }
    }

    /**
     * Uncheck stored course field values that are not allowed in site settings.
     *
     * @return void
     */
    public static function clear_disallowed_course_values(): void {
        foreach (array_keys(self::ACTIVITY_FIELDS) as $modname) {
            self::clear_disallowed_course_values_for_activity($modname, config::get_activity_courseids($modname));
        }
    }

    /**
     * Sync a site course-ID setting into the matching course custom field values.
     *
     * @param string $modname Moodle activity module name.
     * @param string $normalisedcourseids Normalised comma-separated course IDs.
     * @return void
     */
    public static function sync_site_setting_to_course_values(string $modname, string $normalisedcourseids): void {
        global $DB;

        $fieldrecord = self::get_activity_field_record($modname);
        if (!$fieldrecord || $fieldrecord->type !== 'checkbox') {
            return;
        }

        $courseids = $normalisedcourseids === '' ? [] : array_map('intval', explode(',', $normalisedcourseids));
        $courseids = array_values(array_filter($courseids, static fn(int $courseid): bool => $courseid > 0 && $courseid !== SITEID));

        self::clear_disallowed_course_values_for_activity($modname, $courseids);

        $now = time();
        foreach ($courseids as $courseid) {
            $data = $DB->get_record('customfield_data', [
                'fieldid' => (int) $fieldrecord->id,
                'instanceid' => $courseid,
            ], '*', IGNORE_MISSING);

            if ($data) {
                if (!empty($data->intvalue)) {
                    continue;
                }

                $data->intvalue = 1;
                $data->value = '1';
                $data->timemodified = $now;
                $DB->update_record('customfield_data', $data);
                continue;
            }

            $context = \context_course::instance($courseid, IGNORE_MISSING);
            if (!$context) {
                continue;
            }

            $DB->insert_record('customfield_data', (object) [
                'fieldid' => (int) $fieldrecord->id,
                'instanceid' => $courseid,
                'intvalue' => 1,
                'value' => '1',
                'valueformat' => FORMAT_MOODLE,
                'timecreated' => $now,
                'timemodified' => $now,
                'contextid' => (int) $context->id,
            ]);
        }
    }

    /**
     * Uncheck stored course field values for an activity when the course is not site-allowed.
     *
     * @param string $modname Moodle activity module name.
     * @param int[] $allowedcourseids Course IDs allowed in site settings.
     * @return void
     */
    private static function clear_disallowed_course_values_for_activity(string $modname, array $allowedcourseids): void {
        global $DB;

        $fieldrecord = self::get_activity_field_record($modname);
        if (!$fieldrecord || $fieldrecord->type !== 'checkbox') {
            return;
        }

        $params = ['fieldid' => (int) $fieldrecord->id];
        $where = 'fieldid = :fieldid AND intvalue <> 0';
        $allowedcourseids = array_values(array_filter($allowedcourseids, static fn(int $courseid): bool => $courseid > 0));

        if (!empty($allowedcourseids)) {
            [$notinsql, $notinparams] = $DB->get_in_or_equal(
                $allowedcourseids,
                SQL_PARAMS_NAMED,
                'courseid',
                false
            );
            $where .= " AND instanceid {$notinsql}";
            $params = array_merge($params, $notinparams);
        }

        $DB->set_field_select('customfield_data', 'intvalue', 0, $where, $params);
        $DB->set_field_select('customfield_data', 'value', '0', $where, $params);
    }

    /**
     * Whether the course-level setting is enabled for an activity.
     *
     * @param string $modname Moodle activity module name.
     * @param int $courseid Course ID.
     * @return bool
     */
    private static function activity_enabled_for_course(string $modname, int $courseid): bool {
        global $DB;

        if ($courseid <= 0) {
            return false;
        }

        $fieldrecord = self::get_activity_field_record($modname);
        if (!$fieldrecord || $fieldrecord->type !== 'checkbox') {
            return false;
        }

        $data = $DB->get_record('customfield_data', [
            'fieldid' => (int) $fieldrecord->id,
            'instanceid' => $courseid,
        ], 'id, intvalue', IGNORE_MISSING);

        return $data && !empty($data->intvalue);
    }

    /**
     * Get an activity enablement custom field record.
     *
     * @param string $modname Moodle activity module name.
     * @param bool $usecache Whether to reuse the static cache.
     * @return \stdClass|null
     */
    private static function get_activity_field_record(string $modname, bool $usecache = true): ?\stdClass {
        global $DB;

        static $records = [];
        static $loaded = [];

        if (!isset(self::ACTIVITY_FIELDS[$modname])) {
            return null;
        }

        if ($usecache && !empty($loaded[$modname])) {
            return $records[$modname] ?? null;
        }

        $records[$modname] = $DB->get_record_sql(
            "SELECT f.*
               FROM {customfield_field} f
               JOIN {customfield_category} c ON c.id = f.categoryid
              WHERE c.component = :component
                AND c.area = :area
                AND f.shortname = :shortname",
            [
                'component' => 'core_course',
                'area' => 'course',
                'shortname' => self::ACTIVITY_FIELDS[$modname]['shortname'],
            ],
            IGNORE_MISSING
        ) ?: null;
        $loaded[$modname] = true;

        return $records[$modname];
    }

    /**
     * Clear the static field record cache.
     *
     * @param string $modname Moodle activity module name.
     * @return void
     */
    private static function clear_activity_field_record_cache(string $modname): void {
        self::get_activity_field_record($modname, false);
    }

    /**
     * Get this plugin's course custom field category ID if it already exists.
     *
     * @return int
     */
    private static function get_category_id(): int {
        global $DB;

        return (int) $DB->get_field('customfield_category', 'id', [
            'component' => 'core_course',
            'area' => 'course',
            'itemid' => 0,
            'name' => self::CATEGORY_NAME,
        ], IGNORE_MISSING);
    }

    /**
     * Get the managed checkbox field configuration.
     *
     * @return array
     */
    private static function activity_field_config(): array {
        return [
            'required' => 0,
            'uniquevalues' => 0,
            'locked' => 1,
            'visibility' => \core_course\customfield\course_handler::NOTVISIBLE,
            'checkbydefault' => 0,
        ];
    }

    /**
     * Get the managed checkbox field configuration for storage.
     *
     * @return string JSON-encoded field configuration.
     */
    private static function activity_field_config_json(): string {
        return json_encode(self::activity_field_config());
    }

    /**
     * Keep the managed field editable and labelled correctly without touching course values.
     *
     * @param string $modname Moodle activity module name.
     * @param \stdClass $fieldrecord Existing field record.
     * @return void
     */
    private static function update_activity_field(string $modname, \stdClass $fieldrecord): void {
        if ($fieldrecord->type !== 'checkbox') {
            return;
        }

        $definition = self::ACTIVITY_FIELDS[$modname];
        $category = \core_customfield\category_controller::create((int) $fieldrecord->categoryid);
        $field = \core_customfield\field_controller::create((int) $fieldrecord->id, $fieldrecord, $category);
        $field->set('name', get_string($definition['name'], 'local_processfeedback'));
        $field->set('description', '');
        $field->set('descriptionformat', FORMAT_HTML);
        $field->set('sortorder', $definition['sortorder']);
        $field->set('configdata', self::activity_field_config_json());
        $field->save();
        self::clear_activity_field_record_cache($modname);
    }
}
