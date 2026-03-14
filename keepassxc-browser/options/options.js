'use strict';

const options = {};
options.settings = {};

const $ = function(elem) {
    return document.querySelector(elem);
};

options.initMenu = function() {
    const tabs = [].slice.call(document.querySelectorAll('div.tab'));
    const sideBarLinks = [].slice.call(document.querySelectorAll('.sidebar ul.nav li a'));

    sideBarLinks.forEach(function(elem) {
        elem.addEventListener('click', function(e) {
            sideBarLinks.forEach(t => t.parentElement.classList.remove('active'));
            elem.parentElement.classList.add('active');
            tabs.forEach(t => { t.style.display = 'none'; t.classList.add('d-none'); });

            const activatedTab = $('div.tab#tab-' + elem.getAttribute('href').substring(1));
            activatedTab.classList.remove('d-none');
            activatedTab.style.display = 'block';
        });
    });

    $('div.tab').style.display = 'block';

    if (window.location.hash !== '') {
        document.querySelector(`a[href='${window.location.hash}']`)?.click();
    }
};

options.loadSettingsToUI = function() {
    const s = options.settings;

    // Color theme
    const colorTheme = $('#colorTheme');
    if (colorTheme) {
        colorTheme.value = s.colorTheme || 'system';
    }

    // Show notifications
    const notifCb = $('#notificationCheckBox');
    if (notifCb) {
        notifCb.checked = Boolean(s.showNotifications !== false);
    }

    // Password generator settings
    const pwgenLength = $('#pwgenLength');
    if (pwgenLength) {
        const len = Math.min(20, Math.max(8, Number(s.pwgenLength) || 16));
        pwgenLength.value = len;
    }

    const pwgenUseDigits = $('#pwgenUseDigits');
    if (pwgenUseDigits) {
        pwgenUseDigits.checked = s.pwgenUseDigits !== false;
    }

    const pwgenUseLetters = $('#pwgenUseLetters');
    if (pwgenUseLetters) {
        pwgenUseLetters.checked = s.pwgenUseLetters !== false;
    }

    const pwgenUseSymbols = $('#pwgenUseSymbols');
    if (pwgenUseSymbols) {
        pwgenUseSymbols.checked = s.pwgenUseSymbols !== false;
    }
};

options.validateAndSave = async function() {
    // Clamp length
    const pwgenLength = $('#pwgenLength');
    if (pwgenLength) {
        let len = parseInt(pwgenLength.value, 10);
        if (isNaN(len) || len < 8) {
            len = 8;
        } else if (len > 20) {
            len = 20;
        }
        pwgenLength.value = len;
        options.settings.pwgenLength = len;
    }

    // Validate at least one char type is selected
    const useDigits = Boolean($('#pwgenUseDigits')?.checked);
    const useLetters = Boolean($('#pwgenUseLetters')?.checked);
    const useSymbols = Boolean($('#pwgenUseSymbols')?.checked);

    const alert = $('#pwgenAtLeastOneAlert');
    if (!useDigits && !useLetters && !useSymbols) {
        if (alert) {
            alert.classList.remove('d-none');
        }
        return;
    }
    if (alert) {
        alert.classList.add('d-none');
    }

    options.settings.pwgenUseDigits = useDigits;
    options.settings.pwgenUseLetters = useLetters;
    options.settings.pwgenUseSymbols = useSymbols;

    // Color theme
    const colorTheme = $('#colorTheme');
    if (colorTheme) {
        options.settings.colorTheme = colorTheme.value;
    }

    // Notifications
    const notifCb = $('#notificationCheckBox');
    if (notifCb) {
        options.settings.showNotifications = notifCb.checked;
    }

    // usePasswordGeneratorIcons is always true
    options.settings.usePasswordGeneratorIcons = true;

    await browser.storage.local.set({ 'settings': options.settings });
    await browser.runtime.sendMessage({ action: 'load_settings' });

    // Show saved message briefly
    const statusMsg = $('#statusMessage');
    if (statusMsg) {
        statusMsg.classList.remove('d-none');
        setTimeout(() => statusMsg.classList.add('d-none'), 2500);
    }
};

options.initResetDialog = function() {
    const resetBtn = $('#resetSettingsButton');
    if (!resetBtn) {
        return;
    }

    resetBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal($('#dialogResetSettings'));
        modal.show();
    });

    const confirmBtn = $('#dialogResetSettings .yes');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            await browser.runtime.sendMessage({ action: 'reset_all_settings' });
            const settings = await browser.runtime.sendMessage({ action: 'load_settings' });
            options.settings = settings;
            options.loadSettingsToUI();
            bootstrap.Modal.getInstance($('#dialogResetSettings'))?.hide();
        });
    }
};

(async () => {
    try {
        // Eagerly apply color theme to avoid flash
        let theme = localStorage.getItem('colorTheme') || 'system';
        if (theme === 'system') {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-bs-theme', theme);

        const settings = await browser.runtime.sendMessage({ action: 'load_settings' });
        options.settings = settings || {};

        options.initMenu();
        options.loadSettingsToUI();
        options.initResetDialog();

        const saveBtn = $('#saveSettingsButton');
        if (saveBtn) {
            saveBtn.addEventListener('click', options.validateAndSave);
        }

        // Validate char types on checkbox change (show/hide alert immediately)
        const charTypeBoxes = document.querySelectorAll('#pwgenUseDigits, #pwgenUseLetters, #pwgenUseSymbols');
        charTypeBoxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const atLeastOneAlert = $('#pwgenAtLeastOneAlert');
                if (!atLeastOneAlert) {
                    return;
                }
                const anyChecked = $('#pwgenUseDigits').checked || $('#pwgenUseLetters').checked || $('#pwgenUseSymbols').checked;
                if (anyChecked) {
                    atLeastOneAlert.classList.add('d-none');
                } else {
                    atLeastOneAlert.classList.remove('d-none');
                }
            });
        });

        // The form-switch transitions should complete in 150 ms
        setTimeout(() => {
            document.body.classList.remove('no-transitions');
        }, 200);

    } catch (e) {
        console.error('Options init error:', e);
    }
})();
