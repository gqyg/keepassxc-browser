'use strict';

const kpxcPasswordIcons = {};
kpxcPasswordIcons.icons = [];

kpxcPasswordIcons.newIcon = function(field, databaseState = DatabaseState.DISCONNECTED) {
    kpxcPasswordIcons.icons.push(new PasswordIcon(field, databaseState));
};

kpxcPasswordIcons.switchIcon = function(state) {
    kpxcPasswordIcons.icons.forEach(u => u.switchIcon(state));
};

kpxcPasswordIcons.isValid = function(field) {
    if (!field
        || field.readOnly
        || field.offsetWidth < MIN_INPUT_FIELD_OFFSET_WIDTH
        || kpxcIcons.hasIcon(field)
        || !kpxcFields.isVisible(field)) {
        return false;
    }

    return true;
};


class PasswordIcon extends Icon {
    constructor(field, databaseState = DatabaseState.DISCONNECTED) {
        super(field, databaseState);
        this.nextFieldExists = false;

        this.initField(field);
        kpxcIcons.monitorIconPosition(this);
    }
}

PasswordIcon.prototype.initField = function(field) {
    // Observer the visibility
    if (this.observer) {
        this.observer.observe(field);
    }

    this.createIcon(field);
    this.inputField = field;
};

PasswordIcon.prototype.createIcon = function(field) {
    const className = getIconClass('key');
    const size = this.calculateIconSize(field);

    const icon = kpxcUI.createElement('div', 'kpxc kpxc-pwgen-icon ' + className,
        {
            'title': tr('passwordGeneratorGenerateText'),
            'size': size,
            'kpxc-pwgen-field-id': field.getAttribute('data-kpxc-id'),
            'popover': 'manual'
        });

    if (kpxcFields.popoverSupported) {
        icon.style.margin = 0;
    } else {
        icon.style.zIndex = '10000000';
    }
    icon.style.width = Pixels(size);
    icon.style.height = Pixels(size);

    icon.addEventListener('click', async function(e) {
        if (!e.isTrusted) {
            return;
        }

        if (e.shiftKey) {
            if (kpxcFields.popoverSupported) {
                icon.hidePopover();
            } else {
                icon.style.display = 'none';
            }
            return;
        }

        e.stopPropagation();
        kpxcPasswordGenerator.showPasswordGenerator(field);
    });

    icon.addEventListener('mousedown', ev => ev.stopPropagation());
    icon.addEventListener('mouseup', ev => ev.stopPropagation());

    kpxcIcons.setIconPosition(icon, field, this.rtl);
    this.icon = icon;
    this.createWrapper('css/pwgen.css');
    if (kpxcFields.popoverSupported) {
        icon.showPopover();
    }
};


const kpxcPasswordGenerator = {};

kpxcPasswordGenerator.showPasswordGenerator = async function(field) {
    kpxcPasswordGenerator.showLocalGenerator(field ?? document.activeElement);
};

kpxcPasswordGenerator.generate = async function(field) {
    kpxcPasswordGenerator.showLocalGenerator(field ?? document.activeElement);
};

kpxcPasswordGenerator.fill = function(elem, password) {
    if (!elem || !password) {
        return;
    }

    if (password.length === 0) {
        kpxcUI.createNotification('error', tr('usernameLockedFieldText'));
        return;
    }

    if (elem.getAttribute('maxlength')) {
        if (password.length > elem.getAttribute('maxlength')) {
            const message =
                tr('passwordGeneratorErrorTooLong') +
                '\r\n' +
                tr('passwordGeneratorErrorTooLongCut') +
                '\r\n' +
                tr('passwordGeneratorErrorTooLongRemember');
            kpxcUI.createNotification('error', message);
            return;
        }
    }

    elem.value = password;
    elem.dispatchEvent(new Event('input', { bubbles: true }));
    elem.dispatchEvent(new Event('change', { bubbles: true }));

    // Fill next password field if found
    if (kpxc.inputs.length > 0) {
        const index = kpxc.inputs.indexOf(elem);
        const next = kpxc.inputs[index + 1];

        const nextField = next && next.getLowerCaseAttribute('type') === 'password' ? next : undefined;
        if (nextField) {
            nextField.value = password;
            nextField.dispatchEvent(new Event('input', { bubbles: true }));
            nextField.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
};

// Storage key for password generator settings
const PWGEN_SETTINGS_KEY = 'pwgenSettings';

// Default settings for the local password generator
const PWGEN_LOCAL_DEFAULTS = {
    length: 16,
    includeLetters: true,
    includeDigits: true,
    includeSymbols: true,
};

// Load password generator settings from chrome.storage.local
const loadPwgenSettings = async function() {
    const result = await browser.storage.local.get(PWGEN_SETTINGS_KEY);
    return { ...PWGEN_LOCAL_DEFAULTS, ...(result[PWGEN_SETTINGS_KEY] || {}) };
};

// Return a cryptographically random character from the given string
const pwgenRandomChar = function(str) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return str[arr[0] % str.length];
};

// Fisher-Yates shuffle using crypto.getRandomValues
const pwgenShuffle = function(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const rand = new Uint32Array(1);
        crypto.getRandomValues(rand);
        const j = rand[0] % (i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
};

// Generate a password locally using the Web Crypto API (cryptographically secure).
// Policy B: each selected category contributes at least 1 character.
// '.' is always included regardless of category selections.
const localGeneratePassword = function(opts = {}) {
    const { length, includeLetters, includeDigits, includeSymbols } = { ...PWGEN_LOCAL_DEFAULTS, ...opts };

    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    // Extra symbols excluding '.' (which is always forced separately)
    const extraSymbols = '!@#$%^&*()_+-=[]{}|;:,<>?';

    // Build full charset from selected categories
    let charset = '';
    if (includeLetters) {
        charset += lower + upper;
    }
    if (includeDigits) {
        charset += digits;
    }
    if (includeSymbols) {
        charset += extraSymbols;
    }
    // '.' is always valid in the fill pool too
    charset += '.';
    // Fallback: if nothing meaningful was selected, use letters+digits
    if (charset === '.') {
        charset = lower + upper + digits + '.';
    }

    // Build required characters (Policy B enforcement)
    // '.' is always required (fixed requirement, counts as symbol when symbols enabled)
    const required = [ '.' ];
    if (includeLetters) {
        required.push(pwgenRandomChar(lower));
        required.push(pwgenRandomChar(upper));
    }
    if (includeDigits) {
        required.push(pwgenRandomChar(digits));
    }
    // If includeSymbols is enabled, '.' already satisfies the required symbol constraint.

    // Actual length must fit all required characters
    const actualLength = Math.max(length, required.length);

    // Fill remaining positions with random characters from the full charset
    const fillChars = [];
    for (let i = 0; i < actualLength - required.length; i++) {
        fillChars.push(pwgenRandomChar(charset));
    }

    // Combine required + fill, then shuffle
    const allChars = [ ...required, ...fillChars ];
    pwgenShuffle(allChars);
    return allChars.join('');
};

// Show the local password generator panel anchored near the target field
kpxcPasswordGenerator.showLocalGenerator = async function(field) {
    kpxcPasswordGenerator.closeLocalGenerator();

    const settings = await loadPwgenSettings();
    let currentPassword = localGeneratePassword(settings);

    // Build panel elements
    const panel = kpxcUI.createElement('div', 'kpxc kpxc-pwgen-panel', {
        'role': 'dialog',
        'aria-label': tr('passwordGeneratorLocalTitle'),
        'tabindex': '-1',
    });
    initColorTheme(panel);

    const header = kpxcUI.createElement('div', 'kpxc-pwgen-panel-header', {}, tr('passwordGeneratorLocalTitle'));

    const passwordRow = kpxcUI.createElement('div', 'kpxc-pwgen-panel-password-row', {});

    const passwordDisplay = kpxcUI.createElement('input', 'kpxc-pwgen-panel-password', {
        'aria-label': tr('passwordGeneratorLocalTitle'),
        'aria-live': 'polite',
        'readonly': 'true',
        'type': 'text',
    });
    passwordDisplay.value = currentPassword;

    const toggleBtn = kpxcUI.createElement('button', 'kpxc-pwgen-panel-toggle', {
        'aria-label': tr('passwordGeneratorLocalToggle'),
        'title': tr('passwordGeneratorLocalToggle'),
        'type': 'button',
    }, tr('passwordGeneratorLocalHide'));
    toggleBtn.addEventListener('click', function(e) {
        if (!e.isTrusted) {
            return;
        }
        const isText = passwordDisplay.getAttribute('type') === 'text';
        passwordDisplay.setAttribute('type', isText ? 'password' : 'text');
        toggleBtn.textContent = isText ? tr('passwordGeneratorLocalShow') : tr('passwordGeneratorLocalHide');
    });

    passwordRow.appendMultiple(passwordDisplay, toggleBtn);

    const buttons = kpxcUI.createElement('div', 'kpxc-pwgen-panel-buttons', {});

    const closeBtn = kpxcUI.createElement('button', 'kpxc-button kpxc-gray-button', {
        'aria-label': tr('passwordGeneratorLocalClose'),
        'type': 'button',
    }, tr('passwordGeneratorLocalClose'));
    closeBtn.addEventListener('click', function(e) {
        if (!e.isTrusted) {
            return;
        }
        kpxcPasswordGenerator.closeLocalGenerator();
    });

    const regenerateBtn = kpxcUI.createElement('button', 'kpxc-button kpxc-orange-button', {
        'aria-label': tr('passwordGeneratorLocalRegenerate'),
        'type': 'button',
    }, tr('passwordGeneratorLocalRegenerate'));
    regenerateBtn.addEventListener('click', function(e) {
        if (!e.isTrusted) {
            return;
        }
        currentPassword = localGeneratePassword(settings);
        passwordDisplay.value = currentPassword;
        passwordDisplay.setAttribute('type', 'text');
        toggleBtn.textContent = tr('passwordGeneratorLocalHide');
    });

    const useBtn = kpxcUI.createElement('button', 'kpxc-button kpxc-green-button', {
        'aria-label': tr('passwordGeneratorLocalUse'),
        'type': 'button',
    }, tr('passwordGeneratorLocalUse'));
    useBtn.addEventListener('click', function(e) {
        if (!e.isTrusted) {
            return;
        }
        kpxcPasswordGenerator.fill(field, currentPassword);
        kpxcPasswordGenerator.closeLocalGenerator();
    });

    buttons.appendMultiple(closeBtn, regenerateBtn, useBtn);
    panel.appendMultiple(header, passwordRow, buttons);

    // Position the panel below the target field
    if (field && field.getBoundingClientRect) {
        const rect = field.getBoundingClientRect();
        const zoom = kpxcUI.bodyStyle?.zoom || 1;
        const left = kpxcUI.getRelativeLeftPosition(rect) / zoom;
        const top = kpxcUI.getRelativeTopPosition(rect) / zoom;
        const scrollTop = kpxcUI.getScrollTop() / zoom;
        const scrollLeft = kpxcUI.getScrollLeft() / zoom;
        panel.style.top = Pixels(top + scrollTop + field.offsetHeight + 2);
        panel.style.left = Pixels(left + scrollLeft);
    }

    // Create a Shadow DOM wrapper (same pattern as Icon.createWrapper)
    const styleSheet = createStylesheet('css/pwgen.css');
    const colorsSheet = createStylesheet('css/colors.css');
    const wrapper = document.createElement('div');
    wrapper.style.all = 'unset';
    wrapper.style.position = 'absolute';
    wrapper.style.top = Pixels(0);
    wrapper.style.left = Pixels(0);
    wrapper.style.display = 'none';

    let loadedCount = 0;
    const onSheetLoad = () => {
        loadedCount++;
        if (loadedCount >= 2) {
            wrapper.style.display = 'block';
            panel.focus();
        }
    };
    styleSheet.addEventListener('load', onSheetLoad);
    colorsSheet.addEventListener('load', onSheetLoad);

    const shadowRoot = wrapper.attachShadow({ mode: 'closed' });
    shadowRoot.append(colorsSheet, styleSheet, panel);
    document.body.append(wrapper);
    kpxcUI.observeWrapper(wrapper);

    kpxcPasswordGenerator._localGeneratorWrapper = wrapper;

    // Close the panel when Escape is pressed
    kpxcPasswordGenerator._localEscHandler = function(e) {
        if (!e.isTrusted) {
            return;
        }
        if (e.key === 'Escape') {
            kpxcPasswordGenerator.closeLocalGenerator();
        }
    };
    document.addEventListener('keydown', kpxcPasswordGenerator._localEscHandler);
};

// Close and remove the local generator panel
kpxcPasswordGenerator.closeLocalGenerator = function() {
    if (kpxcPasswordGenerator._localGeneratorWrapper) {
        if (document.body && document.body.contains(kpxcPasswordGenerator._localGeneratorWrapper)) {
            document.body.removeChild(kpxcPasswordGenerator._localGeneratorWrapper);
        }
        kpxcPasswordGenerator._localGeneratorWrapper = null;
    }

    if (kpxcPasswordGenerator._localEscHandler) {
        document.removeEventListener('keydown', kpxcPasswordGenerator._localEscHandler);
        kpxcPasswordGenerator._localEscHandler = null;
    }
};
