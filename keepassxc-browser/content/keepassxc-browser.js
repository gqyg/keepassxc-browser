'use strict';

// ---------------------------------------------------------------------------
// Generator-Only content script
// No KeePassXC connection, no database, no autofill — password generation only.
// ---------------------------------------------------------------------------

// Minimal kpxc object that other modules (icon.js, pwgen.js) reference.
const kpxc = {};
kpxc.databaseState = DatabaseState.UNLOCKED;
kpxc.inputs = [];
kpxc.credentials = [];
kpxc.settings = {
    usePasswordGeneratorIcons: true,
    debugLogging: false,
};

/**
 * Add a password-generator icon to every visible, writable password field
 * that does not already have one.
 */
const kpxcInit = {};

kpxcInit.addIconsToPasswordFields = function() {
    const passwordFields = document.querySelectorAll('input[type=password]');
    for (const field of passwordFields) {
        if (kpxcPasswordIcons.isValid(field)) {
            kpxcPasswordIcons.newIcon(field);
            kpxcIcons.icons.push({ field, iconType: kpxcIcons.iconTypes.PASSWORD });
            if (!kpxc.inputs.includes(field)) {
                kpxc.inputs.push(field);
            }
        }
    }
};

/**
 * Watch the DOM for dynamically added password fields (single-page apps, modals, etc.)
 */
kpxcInit.observeDocument = function() {
    const observer = new MutationObserver(function(mutations) {
        if (document.visibilityState === 'hidden' || kpxcUI.mouseDown) {
            return;
        }

        let needsScan = false;
        for (const mut of mutations) {
            if (mut.type === 'childList' && mut.addedNodes.length > 0) {
                needsScan = true;
                break;
            }
            if (mut.type === 'attributes'
                && (mut.attributeName === 'style' || mut.attributeName === 'class')
                && mut.target instanceof HTMLInputElement
                && mut.target.type === 'password') {
                needsScan = true;
                break;
            }
        }

        if (needsScan) {
            kpxcInit.addIconsToPasswordFields();
            kpxcIcons.deleteAllHiddenIcons();
        }
    });

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [ 'style', 'class', 'type' ],
        });
    }
};

/**
 * Keyboard shortcut: Alt+Shift+G (or MacCtrl+Shift+G on macOS) opens the
 * generator panel for the currently focused password field.
 */
browser.commands.onCommand.addListener(function(command) {
    if (command === 'show_password_generator') {
        const active = document.activeElement;
        const field = active?.getLowerCaseAttribute('type') === 'password' ? active : null;
        kpxcPasswordGenerator.showPasswordGenerator(field);
    }
});

/**
 * Main entry point — run after the DOM is ready.
 */
const initContentScript = function() {
    // Skip non-HTML documents (XML feeds, etc.)
    const ct = document?.documentElement?.ownerDocument?.contentType ?? '';
    if (ct !== '' && ct !== 'text/html' && ct !== 'application/xhtml+xml') {
        return;
    }

    kpxcFields.popoverSupported = CSS.supports('selector(:popover-open)');
    kpxcInit.addIconsToPasswordFields();
    kpxcInit.observeDocument();
};

if (document.readyState === 'complete'
    || (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
    initContentScript();
} else {
    document.addEventListener('DOMContentLoaded', initContentScript);
}
