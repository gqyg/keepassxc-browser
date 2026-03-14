'use strict';

const PWGEN_SETTINGS_KEY = 'pwgenSettings';

const DEFAULTS = {
    length: 16,
    includeLetters: true,
    includeDigits: true,
    includeSymbols: true,
};

// Apply i18n messages to elements with data-i18n attribute
const applyI18n = function() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const msg = browser.i18n.getMessage(key);
        if (msg) {
            el.textContent = msg;
        }
    });
};

// Clamp a number value to [min, max]
const clamp = function(value, min, max) {
    return Math.max(min, Math.min(max, value));
};

const loadSettings = async function() {
    const result = await browser.storage.local.get(PWGEN_SETTINGS_KEY);
    return { ...DEFAULTS, ...(result[PWGEN_SETTINGS_KEY] || {}) };
};

const saveSettings = async function(settings) {
    await browser.storage.local.set({ [PWGEN_SETTINGS_KEY]: settings });
};

const init = async function() {
    applyI18n();

    const settings = await loadSettings();

    const lengthSlider = document.getElementById('length-slider');
    const lengthInput = document.getElementById('length');
    const includeLetters = document.getElementById('includeLetters');
    const includeDigits = document.getElementById('includeDigits');
    const includeSymbols = document.getElementById('includeSymbols');
    const saveBtn = document.getElementById('save');
    const savedMsg = document.getElementById('saved-msg');

    // Populate form from loaded settings
    const initialLength = clamp(settings.length, 8, 64);
    lengthSlider.value = initialLength;
    lengthInput.value = initialLength;
    includeLetters.checked = settings.includeLetters;
    includeDigits.checked = settings.includeDigits;
    includeSymbols.checked = settings.includeSymbols;

    // Keep slider and number input in sync
    lengthSlider.addEventListener('input', function() {
        lengthInput.value = lengthSlider.value;
    });

    lengthInput.addEventListener('input', function() {
        const val = clamp(parseInt(lengthInput.value, 10) || DEFAULTS.length, 8, 64);
        lengthSlider.value = val;
        lengthInput.value = val;
    });

    saveBtn.addEventListener('click', async function() {
        const newSettings = {
            length: clamp(parseInt(lengthInput.value, 10) || DEFAULTS.length, 8, 64),
            includeLetters: includeLetters.checked,
            includeDigits: includeDigits.checked,
            includeSymbols: includeSymbols.checked,
        };

        await saveSettings(newSettings);

        // Show confirmation
        savedMsg.classList.remove('hidden');
        setTimeout(() => savedMsg.classList.add('hidden'), 2500);
    });
};

document.addEventListener('DOMContentLoaded', init);
