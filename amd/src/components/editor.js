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
 * Editor component for the Process Feedback UI.
 *
 * @module     local_processfeedback/components/editor
 * @copyright  2026 Process Feedback
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {debugLog} from 'local_processfeedback/utils/logger';

const editorInstanceIds = new WeakMap();
let nextEditorInstanceId = 1;

const PASTE_EVENT_TYPES = ['paste', 'pastepreprocess', 'pastepostprocess'];
const TINYMCE_EVENTS = ['input', 'change', 'cut', 'undo', 'redo', 'paste', 'PastePreProcess', 'PastePostProcess'];
const TEXT_INPUT_EVENTS = ['input', 'change', 'keyup', 'paste', 'cut'];

const getEventType = (event) => String(event && event.type ? event.type : '').toLowerCase();

const getClipboardText = (clipboardData) => {
    if (!clipboardData || typeof clipboardData.getData !== 'function') {
        return '';
    }

    return clipboardData.getData('text/html') ||
        clipboardData.getData('text/plain') ||
        '';
};

/**
 * Check whether an editor event represents a paste action.
 *
 * @param {Event|Object} event Editor event.
 * @return {boolean}
 */
export const isPasteEvent = (event) => PASTE_EVENT_TYPES.indexOf(getEventType(event)) !== -1;

/**
 * Extract pasted content from DOM and TinyMCE paste events.
 *
 * @param {Event|Object} event Editor event.
 * @return {string}
 */
export const getPasteEventText = (event) => {
    if (!event) {
        return '';
    }

    const clipboardText = getClipboardText(event.clipboardData) ||
        getClipboardText(event.originalEvent && event.originalEvent.clipboardData);
    if (clipboardText) {
        return String(clipboardText);
    }

    if (event.content) {
        return String(event.content);
    }

    if (event.node) {
        return event.node.innerText ||
            event.node.textContent ||
            event.node.innerHTML ||
            '';
    }

    return '';
};

const getEditorInstanceId = (target) => {
    if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
        return 'unknown';
    }
    if (!editorInstanceIds.has(target)) {
        editorInstanceIds.set(target, nextEditorInstanceId);
        nextEditorInstanceId += 1;
    }
    return String(editorInstanceIds.get(target));
};

const getTiny = (windowRef) => windowRef.tinyMCE || windowRef.tinymce || null;

const getTinyEditor = (windowRef, editorId) => {
    const tiny = getTiny(windowRef);
    if (!tiny || !editorId || typeof tiny.get !== 'function') {
        return null;
    }

    const editor = tiny.get(editorId);
    return editor && !editor.removed ? editor : null;
};

const getTinyMceEditors = (windowRef) => {
    const tiny = getTiny(windowRef);
    if (!tiny) {
        return [];
    }

    const editorMap = tiny.editors || {};
    return (Array.isArray(editorMap) ? editorMap : Object.keys(editorMap).map((key) => editorMap[key]))
        .filter((editor) => editor && !editor.removed);
};

const getTinyMceEditorElement = (tinyMceEditor) => {
    if (!tinyMceEditor) {
        return null;
    }

    if (typeof tinyMceEditor.getElement === 'function') {
        try {
            return tinyMceEditor.getElement();
        } catch (error) {
            return null;
        }
    }

    return tinyMceEditor.targetElm || null;
};

const getTinyMceEditorContainer = (tinyMceEditor) => {
    if (!tinyMceEditor || typeof tinyMceEditor.getContainer !== 'function') {
        return null;
    }

    try {
        return tinyMceEditor.getContainer();
    } catch (error) {
        return null;
    }
};

const isVisible = (element) => Boolean(
    element &&
    element.isConnected &&
    (
        element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length
    )
);

const isTextInputEditable = (element) => Boolean(
    element &&
    !element.disabled &&
    !element.readOnly &&
    isVisible(element)
);

const isContentEditableElement = (element) => Boolean(
    element &&
    element.isConnected &&
    element.isContentEditable &&
    element.getAttribute('aria-disabled') !== 'true' &&
    isVisible(element)
);

const isTinyMceEditable = (tinyMceEditor) => {
    if (!tinyMceEditor || tinyMceEditor.removed) {
        return false;
    }

    const element = getTinyMceEditorElement(tinyMceEditor);
    if (element && (element.disabled || element.readOnly)) {
        return false;
    }

    if (tinyMceEditor.settings && tinyMceEditor.settings.readonly) {
        return false;
    }

    if (tinyMceEditor.mode && typeof tinyMceEditor.mode.get === 'function' && tinyMceEditor.mode.get() === 'readonly') {
        return false;
    }

    if (typeof tinyMceEditor.getBody === 'function') {
        try {
            const body = tinyMceEditor.getBody();
            if (body && body.isContentEditable === false) {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    return typeof tinyMceEditor.getContent === 'function';
};

const getFormElement = (form, name) => {
    const field = form && form.elements ? form.elements[name] : null;
    if (!field) {
        return null;
    }

    if (typeof field.length === 'number' && typeof field.item === 'function' && !field.tagName) {
        return field.item(0);
    }

    return field;
};

const getFormValue = (form, name) => {
    const field = getFormElement(form, name);
    return field && typeof field.value !== 'undefined' ? String(field.value) : '';
};

const getUniqueElements = (elements) => {
    const seen = [];
    elements.forEach((element) => {
        if (element && element.nodeType === 1 && seen.indexOf(element) === -1) {
            seen.push(element);
        }
    });
    return seen;
};

const getUrlParam = (windowRef, name) => {
    try {
        return new URL(windowRef.location.href).searchParams.get(name) || '';
    } catch (error) {
        return '';
    }
};

const buildTextInputEditor = (element, details) => ({
    id: details.id,
    source: details.source,
    sourceEditorId: details.sourceEditorId || '',
    instanceId: getEditorInstanceId(element),
    placement: details.placement || null,
    getText: () => element.value || '',
    bindInput: (handler) => {
        TEXT_INPUT_EVENTS.forEach((eventName) => element.addEventListener(eventName, handler));

        return () => {
            TEXT_INPUT_EVENTS.forEach((eventName) => element.removeEventListener(eventName, handler));
        };
    },
    isValid: () => element.isConnected,
});

const buildContentEditableEditor = (element, details) => ({
    id: details.id,
    source: details.source,
    sourceEditorId: details.sourceEditorId || '',
    instanceId: getEditorInstanceId(element),
    placement: details.placement || null,
    getText: () => element.innerText || element.textContent || '',
    bindInput: (handler) => {
        TEXT_INPUT_EVENTS.forEach((eventName) => element.addEventListener(eventName, handler));

        return () => {
            TEXT_INPUT_EVENTS.forEach((eventName) => element.removeEventListener(eventName, handler));
        };
    },
    isValid: () => element.isConnected,
});

const buildTinyMceEditor = (tinyMceEditor, details) => ({
    id: details.id || tinyMceEditor.id || 'tinymce-editor',
    source: 'tinymce',
    sourceEditorId: details.sourceEditorId || '',
    instanceId: getEditorInstanceId(tinyMceEditor),
    placement: details.placement || null,
    getText: () => tinyMceEditor.getContent({format: 'text'}) || '',
    bindInput: (handler) => {
        TINYMCE_EVENTS.forEach((eventName) => tinyMceEditor.on(eventName, handler));

        return () => {
            if (tinyMceEditor && !tinyMceEditor.removed && typeof tinyMceEditor.off === 'function') {
                TINYMCE_EVENTS.forEach((eventName) => tinyMceEditor.off(eventName, handler));
            }
        };
    },
    isValid: () => Boolean(
        tinyMceEditor &&
        !tinyMceEditor.removed &&
        typeof tinyMceEditor.getContent === 'function'
    ),
});

const getEditorSignature = (editor) => [
    editor.source,
    editor.sourceEditorId || editor.id,
    editor.instanceId || 'unknown',
].join(':');

const getAssignmentTinyMceEditor = (windowRef) => {
    const byOnlineTextId = getTinyEditor(windowRef, 'id_onlinetext_editor');
    if (byOnlineTextId && isTinyMceEditable(byOnlineTextId)) {
        return byOnlineTextId;
    }

    return getTinyMceEditors(windowRef).find((editor) => {
        if (!isTinyMceEditable(editor)) {
            return false;
        }
        const id = editor && editor.id ? editor.id.toLowerCase() : '';
        const element = getTinyMceEditorElement(editor);
        const elementName = element && element.name ? element.name.toLowerCase() : '';
        const container = getTinyMceEditorContainer(editor);
        const onlineTextContainer = windowRef.document && windowRef.document.getElementById('fitem_id_onlinetext_editor');

        return id.indexOf('onlinetext') !== -1 ||
            id.indexOf('id_onlinetext') !== -1 ||
            elementName.indexOf('onlinetext') !== -1 ||
            Boolean(onlineTextContainer && container && onlineTextContainer.contains(container));
    }) || null;
};

const detectAssignmentEditors = (windowRef, documentRef) => {
    const tinyMceEditor = getAssignmentTinyMceEditor(windowRef);
    if (tinyMceEditor) {
        return [buildTinyMceEditor(tinyMceEditor, {
            id: tinyMceEditor.id || 'tinymce-onlinetext',
        })];
    }

    const textarea = documentRef.getElementById('id_onlinetext_editor') ||
        documentRef.querySelector('textarea[name*="onlinetext"]');
    if (isTextInputEditable(textarea)) {
        return [buildTextInputEditor(textarea, {
            id: textarea.id || textarea.name || 'textarea-onlinetext',
            source: 'textarea',
        })];
    }

    const editable = documentRef.querySelector('[contenteditable="true"][id*="onlinetext"], .editor_atto_content');
    if (isContentEditableElement(editable)) {
        return [buildContentEditableEditor(editable, {
            id: editable.id || 'contenteditable-onlinetext',
            source: 'contenteditable',
        })];
    }

    const editorContainer = documentRef.getElementById('fitem_id_onlinetext_editor');
    if (!editorContainer) {
        return [];
    }

    const iframe = Array.from(editorContainer.querySelectorAll('iframe')).find((candidate) => {
        try {
            return candidate.contentDocument && candidate.contentDocument.body;
        } catch (error) {
            return false;
        }
    });
    if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) {
        return [];
    }

    const body = iframe.contentDocument.body;
    if (!isContentEditableElement(body)) {
        return [];
    }

    return [buildContentEditableEditor(body, {
        id: body.getAttribute('data-id') || iframe.id || 'iframe-onlinetext',
        source: 'iframe',
    })];
};

const getDataAttributeName = (name) => `data-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;

const getClosestDataValue = (element, names) => {
    for (const name of names) {
        const attributeName = getDataAttributeName(name);
        const holder = element.closest(`[${attributeName}]`);
        if (holder) {
            return holder.getAttribute(attributeName) || '';
        }
    }
    return '';
};

const getForumDiscussionId = (windowRef, form) => getFormValue(form, 'discussion') ||
    getClosestDataValue(form, ['discussionid', 'discussionId', 'discussion-id']) ||
    getUrlParam(windowRef, 'd') ||
    getUrlParam(windowRef, 'discussion') ||
    getUrlParam(windowRef, 'discuss');

const getForumReplyTo = (windowRef, form) => getFormValue(form, 'reply') ||
    getFormValue(form, 'parent') ||
    getFormValue(form, 'replyto') ||
    getClosestDataValue(form, ['postid', 'postId', 'post-id', 'replyto', 'replyTo', 'reply-to']) ||
    getUrlParam(windowRef, 'reply') ||
    getUrlParam(windowRef, 'parent') ||
    getUrlParam(windowRef, 'post');

const getForumFallbackId = (form, editorElement) => form.id ||
    editorElement.id ||
    editorElement.name ||
    getEditorInstanceId(form);

const getForumSourceEditorId = (state, windowRef, form, editorElement, sourceMode) => {
    const discussionId = getForumDiscussionId(windowRef, form);
    const replyTo = getForumReplyTo(windowRef, form);

    if (discussionId || replyTo) {
        const sourceParts = [
            'moodle-forum',
            state.params.cmId,
            state.params.userId,
            'discussion',
            discussionId || 'unknown',
            'replyto',
            replyTo || 'unknown',
        ];
        if (sourceMode && sourceMode !== 'default') {
            sourceParts.push('sourceEditor', sourceMode);
        }
        return sourceParts.join(':');
    }

    const fallbackParts = [
        'moodle-forum',
        state.params.cmId,
        state.params.userId,
        'fallback',
        getForumFallbackId(form, editorElement),
    ];
    if (sourceMode && sourceMode !== 'default') {
        fallbackParts.push('sourceEditor', sourceMode);
    }
    return fallbackParts.join(':');
};

const isForumReplyForm = (windowRef, form) => Boolean(
    form &&
    isVisible(form) &&
    getFormElement(form, 'subject') &&
    getForumReplyTo(windowRef, form)
);

const getForumEditorMode = (windowRef, form) => {
    const path = windowRef.location && windowRef.location.pathname ? windowRef.location.pathname : '';
    if (path.indexOf('/mod/forum/post.php') !== -1 || form.id === 'mformforum') {
        return 'advanced';
    }

    if (getFormElement(form, 'message[text]') || getFormElement(form, 'message')) {
        return 'advanced';
    }

    return 'default';
};

const getForumEditorCandidates = (form) => getUniqueElements([
    getFormElement(form, 'post'),
    getFormElement(form, 'message[text]'),
    getFormElement(form, 'message'),
].concat(Array.from(form.querySelectorAll([
    'textarea[name="post"]',
    'textarea[name="message[text]"]',
    'textarea[name="message"]',
    'textarea[id*="post"]',
    'textarea[id*="message"]',
].join(','))))).filter((element) => element.tagName === 'TEXTAREA');

const getTinyMceEditorForElement = (windowRef, element) => {
    if (!element) {
        return null;
    }

    const byElementId = element.id ? getTinyEditor(windowRef, element.id) : null;
    if (byElementId) {
        return byElementId;
    }

    return getTinyMceEditors(windowRef).find((tinyMceEditor) => {
        if (getTinyMceEditorElement(tinyMceEditor) === element) {
            return true;
        }

        const editorId = tinyMceEditor.id || '';
        return Boolean(editorId && element.id && editorId === element.id);
    }) || null;
};

const getTinyMceEditorForForm = (windowRef, form, editorCandidates) => {
    const byCandidate = editorCandidates
        .map((element) => getTinyMceEditorForElement(windowRef, element))
        .find(Boolean);
    if (byCandidate) {
        return byCandidate;
    }

    return getTinyMceEditors(windowRef).find((tinyMceEditor) => {
        const editorElement = getTinyMceEditorElement(tinyMceEditor);
        if (editorElement && (editorElement.form === form || form.contains(editorElement))) {
            return true;
        }

        const editorContainer = getTinyMceEditorContainer(tinyMceEditor);
        if (editorContainer && form.contains(editorContainer)) {
            return true;
        }

        return false;
    }) || null;
};

const getForumEditorPlacementElement = (form, editorElement) => {
    const preferredSelectors = [
        '#fitem_id_message_editor',
        '#fitem_id_message',
        '#fitem_id_post',
    ];
    const preferred = preferredSelectors
        .map((selector) => form.querySelector(selector))
        .find(Boolean);
    if (preferred) {
        return preferred;
    }

    const wrapper = editorElement && editorElement.closest ?
        editorElement.closest('.fitem, .form-group, .mb-3') :
        null;
    if (wrapper && wrapper !== form && form.contains(wrapper)) {
        return wrapper;
    }

    return form;
};

const getForumEditorElement = (windowRef, form) => {
    const sourceMode = getForumEditorMode(windowRef, form);
    const editorCandidates = getForumEditorCandidates(form);
    const tinyMceEditor = getTinyMceEditorForForm(windowRef, form, editorCandidates);
    if (tinyMceEditor) {
        const element = getTinyMceEditorElement(tinyMceEditor) || editorCandidates[0] || form;
        return {
            element,
            sourceMode,
            placementElement: getForumEditorPlacementElement(form, element),
            tinyMceEditor,
        };
    }

    const textElement = editorCandidates.find(isVisible) ||
        (sourceMode === 'default' ? editorCandidates[0] : null);
    if (textElement) {
        return {
            element: textElement,
            sourceMode,
            placementElement: getForumEditorPlacementElement(form, textElement),
            tinyMceEditor: null,
        };
    }

    const editable = form.querySelector('[contenteditable="true"], .editor_atto_content');
    if (editable) {
        return {
            element: editable,
            sourceMode,
            placementElement: getForumEditorPlacementElement(form, editable),
            tinyMceEditor: null,
        };
    }

    return null;
};

const detectForumEditors = (state, windowRef, documentRef) => Array.from(documentRef.querySelectorAll('form'))
    .filter((form) => isForumReplyForm(windowRef, form))
    .map((form) => {
        const editorData = getForumEditorElement(windowRef, form);
        if (!editorData) {
            return null;
        }

        const sourceEditorId = getForumSourceEditorId(
            state,
            windowRef,
            form,
            editorData.element,
            editorData.sourceMode
        );
        const details = {
            id: editorData.element.id || editorData.element.name || sourceEditorId,
            sourceEditorId,
            placement: {
                element: editorData.placementElement || form,
                position: 'beforebegin',
            },
        };

        if (editorData.tinyMceEditor) {
            return buildTinyMceEditor(editorData.tinyMceEditor, details);
        }

        if (editorData.element.isContentEditable || editorData.element.classList.contains('editor_atto_content')) {
            return buildContentEditableEditor(editorData.element, Object.assign({}, details, {
                source: 'contenteditable',
            }));
        }

        return buildTextInputEditor(editorData.element, Object.assign({}, details, {
            source: 'textarea',
        }));
    })
    .filter(Boolean);

export const createEditorBinder = (state, windowRef, documentRef) => {
    let boundEditors = {};
    let lifecycleObserver = null;

    const detectEditors = () => {
        const editors = state.params.moduleName === 'forum' ?
            detectForumEditors(state, windowRef, documentRef) :
            detectAssignmentEditors(windowRef, documentRef);
        debugLog(windowRef, 'Editors detected', {
            moduleName: state.params.moduleName,
            editorCount: editors.length,
            editorSources: editors.map((editor) => editor.source || 'unknown'),
        });
        return editors;
    };

    const detectEditor = () => detectEditors()[0] || null;

    const cleanupEditorInput = (signature = '') => {
        const signatures = signature ? [signature] : Object.keys(boundEditors);
        signatures.forEach((editorSignature) => {
            const binding = boundEditors[editorSignature];
            if (!binding) {
                return;
            }

            if (typeof binding.unbind === 'function') {
                try {
                    binding.unbind();
                } catch (error) {
                    // A replaced editor may already be gone.
                }
            }
            delete boundEditors[editorSignature];
        });
    };

    const syncEditorBindings = (handler) => {
        const editors = detectEditors();
        const activeSignatures = {};
        let changed = false;

        editors.forEach((editor) => {
            if (!editor || !editor.bindInput) {
                return;
            }

            const signature = getEditorSignature(editor);
            activeSignatures[signature] = true;
            const existing = boundEditors[signature];
            if (existing && existing.editor && typeof existing.editor.isValid === 'function' && existing.editor.isValid()) {
                return;
            }

            if (existing) {
                cleanupEditorInput(signature);
            }

            const unbind = editor.bindInput((event) => handler(editor, event));
            boundEditors[signature] = {
                editor,
                unbind: typeof unbind === 'function' ? unbind : null,
            };
            changed = true;
            debugLog(windowRef, 'Editor input binding added', {
                signature,
                editorId: editor.id || '',
                sourceEditorId: editor.sourceEditorId || '',
            });
        });

        Object.keys(boundEditors).forEach((signature) => {
            const binding = boundEditors[signature];
            const isStillActive = activeSignatures[signature] &&
                binding &&
                binding.editor &&
                (
                    typeof binding.editor.isValid !== 'function' ||
                    binding.editor.isValid()
                );
            if (!isStillActive) {
                cleanupEditorInput(signature);
                changed = true;
                debugLog(windowRef, 'Editor input binding removed', {
                    signature,
                });
            }
        });

        return {
            bound: editors.length > 0,
            changed,
        };
    };

    const bindTypingCapture = (handler) => syncEditorBindings(handler).bound;

    const watchEditorLifecycle = (handler, onBound) => {
        if (lifecycleObserver || !documentRef.body || !windowRef.MutationObserver) {
            return;
        }

        lifecycleObserver = new windowRef.MutationObserver(() => {
            const result = syncEditorBindings(handler);
            if (result.changed && typeof onBound === 'function') {
                onBound();
            }
        });

        lifecycleObserver.observe(documentRef.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
        });
        debugLog(windowRef, 'Editor lifecycle observer started');
    };

    return {
        bindTypingCapture,
        cleanupEditorInput,
        detectEditor,
        detectEditors,
        watchEditorLifecycle,
    };
};
