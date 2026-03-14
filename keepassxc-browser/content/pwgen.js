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

    if (this.databaseState === DatabaseState.DISCONNECTED || this.databaseState === DatabaseState.LOCKED) {
        icon.style.filter = 'saturate(0%)';
    }

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
    kpxcPasswordGenerator.generate(field ?? document.activeElement);
};

kpxcPasswordGenerator.generate = async function(field) {
    if (!await isPasswordGeneratorSupported()) {
        // KeePassXC not available or version too low: fall back to local generator
        kpxcPasswordGenerator.showLocalGenerator(field ?? document.activeElement);
        return;
    }

    kpxcPasswordGenerator.fill(field, await sendMessage('generate_password'));
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
            message.style.whiteSpace = 'pre';
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

const isPasswordGeneratorSupported = async function() {
    const response = await browser.runtime.sendMessage({
        action: 'get_features_list'
    });
    return response?.passwordGenerator;
};

// Default settings for the local password generator
const PWGEN_LOCAL_DEFAULTS = {
    length: 16,
    includeDigits: true,
    includeLetters: true,
    includeSymbols: true,
    excludeSimilar: false,
};

// Generate a password locally using the Web Crypto API (cryptographically secure)
const localGeneratePassword = function(opts = {}) {
    const { length, includeDigits, includeLetters, includeSymbols, excludeSimilar } = { ...PWGEN_LOCAL_DEFAULTS, ...opts };
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const similar = new Set('il1Lo0OI');

    let charset = '';
    if (includeLetters) {
        charset += lower + upper;
    }
    if (includeDigits) {
        charset += digits;
    }
    if (includeSymbols) {
        charset += symbols;
    }
    // Fallback: ensure charset is never empty
    if (!charset) {
        charset = lower + upper + digits;
    }
    if (excludeSimilar) {
        charset = Array.from(charset).filter(c => !similar.has(c)).join('');
    }

    // Clamp length to 8-20
    const safeLength = Math.min(20, Math.max(8, length));

    const array = new Uint32Array(safeLength);
    crypto.getRandomValues(array);
    return Array.from(array, x => charset[x % charset.length]).join('');
};

// Build opts from current settings
const getPwgenOpts = function() {
    const s = kpxc.settings;
    const opts = {};
    if (s.pwgenLength !== undefined) {
        opts.length = Math.min(20, Math.max(8, Number(s.pwgenLength)));
    }
    if (s.pwgenUseDigits !== undefined) {
        opts.includeDigits = Boolean(s.pwgenUseDigits);
    }
    if (s.pwgenUseLetters !== undefined) {
        opts.includeLetters = Boolean(s.pwgenUseLetters);
    }
    if (s.pwgenUseSymbols !== undefined) {
        opts.includeSymbols = Boolean(s.pwgenUseSymbols);
    }
    return opts;
};

// Show the local password generator panel anchored near the target field
kpxcPasswordGenerator.showLocalGenerator = function(field) {
    kpxcPasswordGenerator.closeLocalGenerator();

    let currentPassword = localGeneratePassword(getPwgenOpts());

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
        currentPassword = localGeneratePassword(getPwgenOpts());
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
