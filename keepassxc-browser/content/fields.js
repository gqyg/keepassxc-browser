'use strict';

/**
 * @Object kpxcFields
 * Minimal field utilities for the generator-only extension.
 * Retained: isVisible, traverseParents, popoverSupported.
 * Everything related to credential detection, TOTP, autofill, etc. is removed.
 */
const kpxcFields = {};

// Set to true/false at runtime in keepassxc-browser.js once CSS.supports is available.
kpxcFields.popoverSupported = false;

/**
 * Returns the first parent element satisfying {@code predicate} mapped by
 * {@code resultFn}, or {@code defaultValFn()} if none is found.
 */
kpxcFields.traverseParents = function(element, predicate, resultFn = () => true, defaultValFn = () => false) {
    for (let f = element.parentElement; f !== null; f = f.parentElement) {
        if (predicate(f)) {
            return resultFn(f);
        }
    }
    return defaultValFn();
};

/**
 * Checks whether an element is topmost at three horizontal sample points.
 * Uses only standard DOM APIs — no kpxcSites dependency.
 */
kpxcFields.isTopElement = function(elem, rect) {
    if (!elem || !rect) {
        return false;
    }

    const rootNode = elem.getRootNode() ?? document;

    const getTopmostElement = (element, x, elementRect) => {
        const topElement = rootNode.elementFromPoint(x, elementRect.top + (elementRect.height / 2));
        return element?.labels
            && element.labels[0] === topElement
            && elementsOverlap(elementRect, topElement.getBoundingClientRect())
            ? element
            : topElement;
    };

    if (matchesWithNodeName(elem, 'INPUT') && [
        getTopmostElement(elem, rect.left + (rect.width / 4), rect),
        getTopmostElement(elem, rect.left + (rect.width / 2), rect),
        getTopmostElement(elem, rect.left + (rect.width / 1.33), rect),
    ].some(e => e !== elem)) {
        return false;
    }

    return true;
};

/**
 * Returns true if the element is visible and interactable on the current page.
 */
kpxcFields.isVisible = function(elem) {
    const isOpacityAllowed = (opacity) => {
        const opac = Number(opacity);
        return opacity === '' || (opac >= MIN_OPACITY && opac <= MAX_OPACITY);
    };

    const rect = elem.getBoundingClientRect();
    if (rect.x < 0
        || rect.y < 0
        || rect.width < MIN_INPUT_FIELD_WIDTH_PX
        || rect.x > Math.max(document.body.scrollWidth, document.body.offsetWidth, document.documentElement.clientWidth)
        || rect.y > Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight)
        || rect.height < MIN_INPUT_FIELD_WIDTH_PX) {
        return false;
    }

    if (!kpxcFields.isTopElement(elem, rect)) {
        return false;
    }

    const elemStyle = getComputedStyle(elem);
    if ((elemStyle.visibility && (elemStyle.visibility === 'hidden' || elemStyle.visibility === 'collapse'))
        || !isOpacityAllowed(elemStyle.opacity)
        || parseInt(elemStyle.width, 10) <= MIN_INPUT_FIELD_WIDTH_PX
        || parseInt(elemStyle.height, 10) <= MIN_INPUT_FIELD_WIDTH_PX) {
        return false;
    }

    if (kpxcFields.traverseParents(elem, f => !isOpacityAllowed(f.style.opacity))) {
        return false;
    }

    return true;
};
