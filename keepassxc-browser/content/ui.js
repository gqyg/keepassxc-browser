'use strict';

const MIN_TOTP_INPUT_LENGTH = 6;
const MAX_TOTP_INPUT_LENGTH = 10;
const MIN_INPUT_FIELD_WIDTH_PX = 8;
const MIN_INPUT_FIELD_OFFSET_WIDTH = 60;
const MIN_OPACITY = 0.7;
const MAX_OPACITY = 1;

const BLUE_BUTTON = 'kpxc-button kpxc-blue-button';
const GREEN_BUTTON = 'kpxc-button kpxc-green-button';
const ORANGE_BUTTON = 'kpxc-button kpxc-orange-button';
const RED_BUTTON = 'kpxc-button kpxc-red-button';
const GRAY_BUTTON_CLASS = 'kpxc-gray-button';

const ALLOWED_OBSERVER_NODETYPES = [
    Node.ELEMENT_NODE,
    Node.DOCUMENT_NODE,
    Node.DOCUMENT_FRAGMENT_NODE
];

const OBSERVER_OPTIONS = { attributes: true, attributeFilter: [ 'style' ] };

const DatabaseState = {
    DISCONNECTED: 0,
    LOCKED: 1,
    UNLOCKED: 2
};

// jQuery-style wrapper for querySelector
const $ = function(elem) {
    return document.querySelector(elem);
};

const kpxcUI = {};
kpxcUI.mouseDown = false;

if (document.body) {
    const bodyRect = document.body.getBoundingClientRect();
    kpxcUI.bodyRect = {
        left: bodyRect.left + window.pageXOffset,
        top: bodyRect.top + window.pageYOffset
    };
    kpxcUI.bodyStyle = getComputedStyle(document.body);
}

// Wrapper for creating elements
kpxcUI.createElement = function(type, classes, attributes, textContent) {
    const element = document.createElement(type);

    if (classes) {
        const splitted = classes.split(' ');
        for (const c of splitted) {
            element.classList.add(c);
        }
    }

    if (attributes !== undefined) {
        Object.keys(attributes).forEach((key) => {
            element.setAttribute(key, attributes[key]);
        });
    }

    if (textContent !== undefined) {
        element.textContent = textContent;
    }

    return element;
};

kpxcUI.getScrollTop = function() {
    return document.defaultView?.scrollY ?? document.scrollingElement?.scrollTop ?? 0;
};

kpxcUI.getScrollLeft = function() {
    return document.defaultView?.scrollX ?? document.scrollingElement?.scrollLeft ?? 0;
};

kpxcUI.getRelativeLeftPosition = function(rect) {
    return kpxcUI.bodyStyle?.position?.toLowerCase() === 'relative' ? rect.left - kpxcUI.bodyRect.left : rect.left;
};

kpxcUI.getRelativeTopPosition = function(rect) {
    return kpxcUI.bodyStyle?.position?.toLowerCase() === 'relative' ? rect.top - kpxcUI.bodyRect.top : rect.top;
};

kpxcUI.isRTL = function(field) {
    if (!field) {
        return false;
    }

    const style = getComputedStyle(field);
    if (style.textAlign.toLowerCase() === 'left') {
        return false;
    } else if (style.textAlign.toLowerCase() === 'right') {
        return true;
    }

    return kpxcFields.traverseParents(field,
        f => [ 'ltr', 'rtl' ].includes(f.getLowerCaseAttribute('dir')),
        f => ({ 'ltr': false, 'rtl': true })[f.getLowerCaseAttribute('dir')]);
};

// Observe and prevent style changes to wrapper div elements
kpxcUI.createWrapperObserver = function() {
    kpxcUI.wrapperObserver = new MutationObserver(function(mutations) {
        for (const mut of mutations) {
            if (mut?.target && mut.target.style?.cssText !== 'all: unset;') {
                mut.target.removeAttribute('style');
                mut.target.style.all = 'unset';
            }
        }
    });
};

kpxcUI.observeWrapper = function(elem) {
    kpxcUI.wrapperObserver?.observe(elem, OBSERVER_OPTIONS);
};

// Not needed in generator-only mode — kept as a no-op for compatibility with icon.js.
kpxcUI.createPageObserver = function() { /* no-op */ };

const createStylesheet = function(file) {
    const stylesheet = document.createElement('link');
    stylesheet.setAttribute('rel', 'stylesheet');
    stylesheet.setAttribute('href', browser.runtime.getURL(file));
    return stylesheet;
};

const preventDefaultDragEnd = function(e) {
    e?.preventDefault();
};

const logDebug = function(message, extra) {
    if (kpxc?.settings?.debugLogging) {
        debugLogMessage(message, extra);
    }
};

const initObservers = function() {
    kpxcUI.createWrapperObserver();
    kpxcUI.createPageObserver();
};

document.addEventListener('mousedown', function(e) {
    if (!e.isTrusted) {
        return;
    }
    kpxcUI.mouseDown = true;
});

document.addEventListener('mouseup', function(e) {
    if (!e.isTrusted) {
        return;
    }
    kpxcUI.mouseDown = false;
});

if (document.readyState === 'complete' || (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
    initObservers();
} else {
    document.addEventListener('DOMContentLoaded', initObservers);
}

HTMLDivElement.prototype.appendMultiple = function(...args) {
    for (const a of args) {
        this.append(a);
    }
};

Element.prototype.getLowerCaseAttribute = function(attr) {
    return this.getAttribute(attr) ? this.getAttribute(attr).toLowerCase() : undefined;
};

Element.prototype._attachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function() {
    try {
        return this._attachShadow({ mode: 'closed' });
    } catch (e) {
        logError(e);
    }
};

Object.prototype.shadowSelector = function(value) {
    return this.shadowRoot ? this.shadowRoot.querySelector(value) : undefined;
};

Object.prototype.shadowSelectorAll = function(value) {
    return this.shadowRoot ? this.shadowRoot.querySelectorAll(value) : undefined;
};
