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

namespace local_processfeedback\privacy;

use core_privacy\local\metadata\collection;

/**
 * Privacy provider for Process Feedback local plugin data.
 *
 * Browser-local IndexedDB data and user-generated ZIP exports may contain
 * personal or educational data. They are documented in the README and plugin
 * details. Assignment-submitted process data is handled by
 * assignsubmission_processfeedback.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class provider implements \core_privacy\local\metadata\provider {
    /**
     * Describe personal data handled by the plugin.
     *
     * @param collection $collection The metadata collection to add to.
     * @return collection The metadata collection.
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_subsystem_link(
            'core_files',
            [],
            'privacy:metadata:core_files'
        );

        $collection->add_external_location_link('processfeedback_explorer', [
            'name' => 'privacy:metadata:processfeedback_explorer:name',
            'email' => 'privacy:metadata:processfeedback_explorer:email',
            'institute' => 'privacy:metadata:processfeedback_explorer:institute',
            'course' => 'privacy:metadata:processfeedback_explorer:course',
            'activity' => 'privacy:metadata:processfeedback_explorer:activity',
            'writingtext' => 'privacy:metadata:processfeedback_explorer:writingtext',
            'revisions' => 'privacy:metadata:processfeedback_explorer:revisions',
            'pasteevents' => 'privacy:metadata:processfeedback_explorer:pasteevents',
        ], 'privacy:metadata:processfeedback_explorer');

        return $collection;
    }
}
