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
 * Submission interceptor for the Process Feedback UI.
 *
 * @module     local_processfeedback/submission/interceptor
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {uploadProcessFeedbackSubmission} from 'local_processfeedback/submission/upload';
import {debugError, debugLog} from 'local_processfeedback/utils/logger';

const SUBMIT_BUTTON_SELECTOR = '#id_submitbutton';
const DRAFT_ITEM_ID_FIELD = 'processfeedback_draftitemid';
const INCLUDE_DATA_FIELD = 'processfeedback_include_data';

const getAssignForm = (documentRef) => documentRef.querySelector('#mform1') ||
    documentRef.querySelector('form[action*="mod/assign"]');

const getDraftItemIdInput = (assignForm) => assignForm.querySelector(`input[name="${DRAFT_ITEM_ID_FIELD}"]`);

const shouldUploadProcessData = (assignForm) => {
    const inputs = Array.from(assignForm.querySelectorAll(`input[name="${INCLUDE_DATA_FIELD}"]`));
    const checkbox = inputs.find((input) => input.type === 'checkbox');
    if (!checkbox) {
        return true;
    }

    return checkbox.checked;
};

const getFormDraftItemId = (assignForm) => {
    const input = getDraftItemIdInput(assignForm);
    const draftItemId = input ? Number(input.value) : 0;
    return Number.isInteger(draftItemId) && draftItemId > 0 ? draftItemId : 0;
};

const setFormDraftItemId = (assignForm, draftItemId) => {
    const input = getDraftItemIdInput(assignForm);
    if (input) {
        input.value = String(draftItemId);
    }
};

export const initSubmissionInterceptor = (state, revisionStore, autosaveService, windowRef, documentRef) => {
    const submitButton = documentRef.querySelector(SUBMIT_BUTTON_SELECTOR);
    if (!submitButton || submitButton.dataset.processfeedbackSubmissionInterceptor === 'true') {
        debugLog(windowRef, 'Submission interceptor skipped', {
            hasSubmitButton: Boolean(submitButton),
            alreadyInitialised: submitButton ? submitButton.dataset.processfeedbackSubmissionInterceptor : '',
        });
        return;
    }

    const assignForm = getAssignForm(documentRef);
    if (!assignForm) {
        debugLog(windowRef, 'Submission interceptor skipped: assign form not found');
        return;
    }

    // The assignsubmission subplugin adds this field only when Moodle will persist it.
    if (!getDraftItemIdInput(assignForm)) {
        debugLog(windowRef, 'Submission interceptor skipped: draft item field not found');
        return;
    }

    submitButton.dataset.processfeedbackSubmissionInterceptor = 'true';
    debugLog(windowRef, 'Submission interceptor initialised');
    let submitting = false;
    let submitButtonClicked = false;

    submitButton.addEventListener('click', () => {
        submitButtonClicked = true;
    });

    assignForm.addEventListener('submit', async(event) => {
        if (event.submitter && event.submitter !== submitButton) {
            debugLog(windowRef, 'Submission interceptor ignored alternate submitter');
            return;
        }
        if (!event.submitter && !submitButtonClicked) {
            debugLog(windowRef, 'Submission interceptor ignored submit without tracked button click');
            return;
        }
        if (submitting) {
            debugLog(windowRef, 'Submission interceptor ignored recursive submit');
            return;
        }
        if (!shouldUploadProcessData(assignForm)) {
            debugLog(windowRef, 'Submission process-data upload skipped by form setting');
            return;
        }

        submitting = true;
        submitButtonClicked = false;
        event.preventDefault();

        // The assignment submission plugin creates the draft area when it renders the form.
        const formDraftItemId = getFormDraftItemId(assignForm);
        let uploaded = false;
        try {
            const draftItemId = await uploadProcessFeedbackSubmission(
                state,
                revisionStore,
                autosaveService,
                windowRef,
                formDraftItemId
            );
            uploaded = Boolean(draftItemId);
            debugLog(windowRef, uploaded ?
                'Submission process data uploaded to the form draft area' :
                'No process data uploaded — submission will proceed without process data', {draftItemId});
        } catch (error) {
            // Submission must never be blocked by Process Feedback packaging.
            debugError(windowRef, 'Unexpected error during process data upload. ' +
                'Submission will proceed without process data.', error);
        }

        if (!uploaded) {
            // Do not link a partly uploaded draft area to the submission.
            setFormDraftItemId(assignForm, 0);
        }

        debugLog(windowRef, 'Continuing Moodle assignment submission');
        if (assignForm.requestSubmit) {
            assignForm.requestSubmit(submitButton);
            return;
        }
        assignForm.submit();
    });
};
