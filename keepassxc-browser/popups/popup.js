'use strict';

(async () => {
    await initColorTheme();

    $('#options-button')?.addEventListener('click', () => {
        browser.runtime.openOptionsPage();
        window.close();
    });
})();
