'use strict';

// ---------------------------------------------------------------------------
// Local password generator — no KeePassXC connection required.
// Defaults: length=16, symbols=true, excludeSimilar=false.
// ---------------------------------------------------------------------------

const PWGEN_DEFAULTS = {
    length: 16,
    useSymbols: true,
    excludeSimilar: false,
};

/**
 * Generate a cryptographically-random password using rejection sampling to
 * avoid modulo bias.
 */
const localPwGen = {};
localPwGen.generate = function(opts) {
    const length = opts?.length ?? PWGEN_DEFAULTS.length;
    const useSymbols = opts?.useSymbols ?? PWGEN_DEFAULTS.useSymbols;
    const excludeSimilar = opts?.excludeSimilar ?? PWGEN_DEFAULTS.excludeSimilar;

    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const similar = 'iIlLoO01';

    let charset = upper + lower + digits;
    if (useSymbols) {
        charset += symbols;
    }
    if (excludeSimilar) {
        charset = charset.split('').filter(c => !similar.includes(c)).join('');
    }

    const charsetLen = charset.length;
    // Compute the largest multiple of charsetLen that fits in a Uint32 to avoid
    // modulo bias via rejection sampling.
    const maxUnbiased = Math.floor(0x100000000 / charsetLen) * charsetLen;
    const result = [];

    while (result.length < length) {
        const buf = new Uint32Array(length - result.length);
        crypto.getRandomValues(buf);
        for (const v of buf) {
            if (result.length >= length) {
                break;
            }
            // Reject values that would introduce bias
            if (v < maxUnbiased) {
                result.push(charset[v % charsetLen]);
            }
        }
    }

    return result.join('');
};

// ---------------------------------------------------------------------------
// Generator panel (Shadow DOM — isolated from page styles)
// ---------------------------------------------------------------------------

const kpxcGeneratorPanel = {};
kpxcGeneratorPanel.activePanel = null;
kpxcGeneratorPanel.outsideClickHandler = null;

kpxcGeneratorPanel.close = function() {
    if (kpxcGeneratorPanel.outsideClickHandler) {
        document.removeEventListener('click', kpxcGeneratorPanel.outsideClickHandler, true);
        kpxcGeneratorPanel.outsideClickHandler = null;
    }
    if (kpxcGeneratorPanel.activePanel) {
        kpxcGeneratorPanel.activePanel.remove();
        kpxcGeneratorPanel.activePanel = null;
    }
};

kpxcGeneratorPanel.show = function(targetField) {
    kpxcGeneratorPanel.close();

    const opts = { ...PWGEN_DEFAULTS };
    let currentPassword = localPwGen.generate(opts);

    // Shadow-DOM wrapper — isolates styles from the host page
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'all:initial!important;';
    kpxcGeneratorPanel.activePanel = wrapper;

    // attachShadow is overridden in ui.js to always use closed mode,
    // but the return value (shadow root) is stored here for later access.
    const shadow = wrapper.attachShadow({ mode: 'closed' });
    if (!shadow) {
        return;
    }

    // Inline styles for the panel — no external CSS file needed
    const style = document.createElement('style');
    style.textContent = `
        :host { all: initial; }
        .kpxcpanel {
            position: fixed;
            background: #ffffff;
            border: 1px solid #cccccc;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.20);
            padding: 14px;
            min-width: 290px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 13px;
            color: #222222;
            z-index: 2147483647;
            box-sizing: border-box;
        }
        @media (prefers-color-scheme: dark) {
            .kpxcpanel {
                background: #2b2a2a;
                border-color: #444444;
                color: #cbcfcb;
            }
            .kpxcpanel-pw {
                background: #3b3b3d !important;
                color: #cbcfcb !important;
                border-color: #555555 !important;
            }
            .kpxcpanel-length {
                background: #3b3b3d !important;
                color: #cbcfcb !important;
                border-color: #555555 !important;
            }
        }
        .kpxcpanel-title {
            font-weight: 600;
            margin-bottom: 10px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .kpxcpanel-pw {
            width: 100%;
            box-sizing: border-box;
            padding: 6px 8px;
            border: 1px solid #cccccc;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
            margin-bottom: 10px;
            background: #f8f8f8;
            color: #111;
            cursor: text;
        }
        .kpxcpanel-row {
            display: flex;
            align-items: center;
            margin-bottom: 7px;
            gap: 8px;
        }
        .kpxcpanel-row label {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            flex: 1;
        }
        .kpxcpanel-length-label {
            white-space: nowrap;
        }
        .kpxcpanel-length {
            width: 54px;
            padding: 3px 5px;
            border: 1px solid #cccccc;
            border-radius: 4px;
            font-size: 13px;
            background: #ffffff;
            color: #222;
        }
        .kpxcpanel-buttons {
            display: flex;
            gap: 6px;
            margin-top: 10px;
        }
        .kpxcpanel-btn {
            padding: 5px 13px;
            border-radius: 4px;
            border: 1px solid transparent;
            cursor: pointer;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            white-space: nowrap;
        }
        .kpxcpanel-btn-regen {
            background: #007bff;
            border-color: #007bff;
            color: #ffffff;
        }
        .kpxcpanel-btn-use {
            background: #28a745;
            border-color: #28a745;
            color: #ffffff;
        }
        .kpxcpanel-btn-close {
            background: #dc3545;
            border-color: #dc3545;
            color: #ffffff;
        }
        .kpxcpanel-btn:hover {
            filter: brightness(88%);
            cursor: pointer;
        }
    `;

    const panel = document.createElement('div');
    panel.className = 'kpxcpanel';

    // Title
    const title = document.createElement('div');
    title.className = 'kpxcpanel-title';
    title.textContent = '🔑 Password Generator';
    panel.appendChild(title);

    // Generated-password display
    const pwInput = document.createElement('input');
    pwInput.type = 'text';
    pwInput.className = 'kpxcpanel-pw';
    pwInput.readOnly = true;
    pwInput.value = currentPassword;
    panel.appendChild(pwInput);

    // Length row
    const lengthRow = document.createElement('div');
    lengthRow.className = 'kpxcpanel-row';
    const lengthSpan = document.createElement('span');
    lengthSpan.className = 'kpxcpanel-length-label';
    lengthSpan.textContent = 'Length:';
    const lengthInput = document.createElement('input');
    lengthInput.type = 'number';
    lengthInput.className = 'kpxcpanel-length';
    lengthInput.min = '8';
    lengthInput.max = '128';
    lengthInput.value = String(opts.length);
    lengthInput.addEventListener('change', () => {
        const v = parseInt(lengthInput.value, 10);
        if (v >= 8 && v <= 128) {
            opts.length = v;
            currentPassword = localPwGen.generate(opts);
            pwInput.value = currentPassword;
        }
    });
    lengthRow.appendChild(lengthSpan);
    lengthRow.appendChild(lengthInput);
    panel.appendChild(lengthRow);

    // Symbols checkbox
    const symbolsRow = document.createElement('div');
    symbolsRow.className = 'kpxcpanel-row';
    const symbolsLabel = document.createElement('label');
    const symbolsCheck = document.createElement('input');
    symbolsCheck.type = 'checkbox';
    symbolsCheck.checked = opts.useSymbols;
    symbolsCheck.addEventListener('change', () => {
        opts.useSymbols = symbolsCheck.checked;
        currentPassword = localPwGen.generate(opts);
        pwInput.value = currentPassword;
    });
    symbolsLabel.appendChild(symbolsCheck);
    symbolsLabel.appendChild(document.createTextNode(' Include symbols (!@#$…)'));
    symbolsRow.appendChild(symbolsLabel);
    panel.appendChild(symbolsRow);

    // Exclude-similar checkbox
    const similarRow = document.createElement('div');
    similarRow.className = 'kpxcpanel-row';
    const similarLabel = document.createElement('label');
    const similarCheck = document.createElement('input');
    similarCheck.type = 'checkbox';
    similarCheck.checked = opts.excludeSimilar;
    similarCheck.addEventListener('change', () => {
        opts.excludeSimilar = similarCheck.checked;
        currentPassword = localPwGen.generate(opts);
        pwInput.value = currentPassword;
    });
    similarLabel.appendChild(similarCheck);
    similarLabel.appendChild(document.createTextNode(' Exclude similar chars (i, l, 1, O, 0…)'));
    similarRow.appendChild(similarLabel);
    panel.appendChild(similarRow);

    // Action buttons
    const buttons = document.createElement('div');
    buttons.className = 'kpxcpanel-buttons';

    const regenBtn = document.createElement('button');
    regenBtn.className = 'kpxcpanel-btn kpxcpanel-btn-regen';
    regenBtn.textContent = 'Regenerate';
    regenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentPassword = localPwGen.generate(opts);
        pwInput.value = currentPassword;
    });

    const useBtn = document.createElement('button');
    useBtn.className = 'kpxcpanel-btn kpxcpanel-btn-use';
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        kpxcPasswordGenerator.fill(targetField, currentPassword);
        kpxcGeneratorPanel.close();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kpxcpanel-btn kpxcpanel-btn-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        kpxcGeneratorPanel.close();
    });

    buttons.appendChild(regenBtn);
    buttons.appendChild(useBtn);
    buttons.appendChild(closeBtn);
    panel.appendChild(buttons);

    shadow.appendChild(style);
    shadow.appendChild(panel);
    document.body.appendChild(wrapper);

    // Position panel relative to target field using fixed coordinates
    const rect = targetField.getBoundingClientRect();
    const PANEL_HEIGHT_ESTIMATE = 210;
    const PANEL_WIDTH = 300;

    let top;
    if (rect.bottom + 6 + PANEL_HEIGHT_ESTIMATE <= window.innerHeight) {
        top = rect.bottom + 6;
    } else if (rect.top - 6 - PANEL_HEIGHT_ESTIMATE >= 0) {
        top = rect.top - PANEL_HEIGHT_ESTIMATE - 6;
    } else {
        top = Math.max(6, rect.bottom + 6);
    }

    let left = rect.left;
    if (left + PANEL_WIDTH > window.innerWidth - 6) {
        left = Math.max(6, window.innerWidth - PANEL_WIDTH - 6);
    }

    panel.style.top = Pixels(top);
    panel.style.left = Pixels(left);

    // Close the panel when the user clicks outside it
    kpxcGeneratorPanel.outsideClickHandler = function(e) {
        if (!e.composedPath().includes(wrapper)) {
            kpxcGeneratorPanel.close();
        }
    };
    setTimeout(() => {
        document.addEventListener('click', kpxcGeneratorPanel.outsideClickHandler, true);
    }, 0);
};

// ---------------------------------------------------------------------------
// Password icon management
// ---------------------------------------------------------------------------

const kpxcPasswordIcons = {};
kpxcPasswordIcons.icons = [];

// Always use UNLOCKED so the icon renders at full colour without a KeePassXC connection.
kpxcPasswordIcons.newIcon = function(field) {
    kpxcPasswordIcons.icons.push(new PasswordIcon(field, DatabaseState.UNLOCKED));
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
    constructor(field, databaseState = DatabaseState.UNLOCKED) {
        super(field, databaseState);
        this.initField(field);
        kpxcIcons.monitorIconPosition(this);
    }
}

PasswordIcon.prototype.initField = function(field) {
    if (this.observer) {
        this.observer.observe(field);
    }
    this.createIcon(field);
    this.inputField = field;
};

PasswordIcon.prototype.createIcon = function(field) {
    const className = getIconClass('key');
    const size = this.calculateIconSize(field);

    const icon = kpxcUI.createElement('div', 'kpxc kpxc-pwgen-icon ' + className, {
        'title': 'Generate password',
        'size': size,
    });

    if (kpxcFields.popoverSupported) {
        icon.setAttribute('popover', 'manual');
        icon.style.margin = 0;
    } else {
        icon.style.zIndex = '10000000';
    }
    icon.style.width = Pixels(size);
    icon.style.height = Pixels(size);

    icon.addEventListener('click', function(e) {
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

// Override switchIcon so the generator icon always appears at full colour.
PasswordIcon.prototype.switchIcon = function() {
    if (this.icon) {
        this.icon.style.filter = 'saturate(100%)';
    }
};

// ---------------------------------------------------------------------------
// Public API kept for keyboard-shortcut wiring in keepassxc-browser.js
// ---------------------------------------------------------------------------

const kpxcPasswordGenerator = {};

kpxcPasswordGenerator.showPasswordGenerator = function(field) {
    kpxcGeneratorPanel.show(field ?? document.activeElement);
};

kpxcPasswordGenerator.fill = function(elem, password) {
    if (!elem || !password || password.length === 0) {
        return;
    }

    elem.value = password;
    elem.dispatchEvent(new Event('input', { bubbles: true }));
    elem.dispatchEvent(new Event('change', { bubbles: true }));

    // Fill the next sibling password field too (e.g. "confirm password")
    const inputs = kpxc.inputs ?? [];
    const index = inputs.indexOf(elem);
    if (index >= 0) {
        const next = inputs[index + 1];
        if (next && next.getLowerCaseAttribute('type') === 'password') {
            next.value = password;
            next.dispatchEvent(new Event('input', { bubbles: true }));
            next.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
};
