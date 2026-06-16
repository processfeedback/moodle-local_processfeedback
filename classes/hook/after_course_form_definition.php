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

/**
 * Adjust Process Feedback custom fields on the course edit form.
 *
 * @package    local_processfeedback
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class after_course_form_definition {
    /** @var string Form element name for the forum enablement custom field. */
    private const FORUM_ELEMENT = 'customfield_processfeedbackforums';

    /** @var string Form element name for the assignment enablement custom field. */
    private const ASSIGNMENT_ELEMENT = 'customfield_processfeedbackassignments';

    /** @var string Group element name for Process Feedback course enablement controls. */
    private const GROUP_ELEMENT = 'processfeedback_course_enablement';

    /**
     * Replace the two generated checkbox rows with one labelled checkbox group.
     *
     * @param \core_course\hook\after_form_definition $hook Course form hook.
     * @return void
     */
    public static function callback(\core_course\hook\after_form_definition $hook): void {
        global $OUTPUT;

        $mform = $hook->mform;

        if (!$mform->elementExists(self::FORUM_ELEMENT) || !$mform->elementExists(self::ASSIGNMENT_ELEMENT) ||
                $mform->elementExists(self::GROUP_ELEMENT)) {
            return;
        }

        $forumcheckbox = $mform->createElement(
            'advcheckbox',
            self::FORUM_ELEMENT,
            '',
            get_string('enableforumscourse', 'local_processfeedback')
        );
        $forumcheckbox->_helpbutton = $OUTPUT->help_icon('enableforumscourse', 'local_processfeedback');

        $assignmentcheckbox = $mform->createElement(
            'advcheckbox',
            self::ASSIGNMENT_ELEMENT,
            '',
            get_string('enableassignmentscourse', 'local_processfeedback')
        );
        $assignmentcheckbox->_helpbutton = $OUTPUT->help_icon('enableassignmentscourse', 'local_processfeedback');

        $groupElement = $mform->createElement(
            'group',
            self::GROUP_ELEMENT,
            get_string('choosewhereenableprocessfeedback', 'local_processfeedback'),
            [$forumcheckbox, $assignmentcheckbox],
            ['<br>'],
            false,
        );
        $mform->insertElementBefore($groupElement, self::FORUM_ELEMENT);

        self::remove_element_if_exists($mform, self::FORUM_ELEMENT . '_static');
        self::remove_element_if_exists($mform, self::ASSIGNMENT_ELEMENT . '_static');
        $mform->removeElement(self::FORUM_ELEMENT);
        $mform->removeElement(self::ASSIGNMENT_ELEMENT);

        $mform->setDefault(self::FORUM_ELEMENT, 0);
        $mform->setDefault(self::ASSIGNMENT_ELEMENT, 0);
        $mform->setType(self::FORUM_ELEMENT, PARAM_BOOL);
        $mform->setType(self::ASSIGNMENT_ELEMENT, PARAM_BOOL);
    }

    /**
     * Remove a form element when it exists.
     *
     * @param \MoodleQuickForm $mform Moodle form.
     * @param string $elementname Element name.
     * @return void
     */
    private static function remove_element_if_exists(\MoodleQuickForm $mform, string $elementname): void {
        if ($mform->elementExists($elementname)) {
            $mform->removeElement($elementname);
        }
    }
}
