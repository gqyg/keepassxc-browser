'use strict';

/**
 * @Object kpxcIcons
 * Minimal icon-handling for the generator-only extension.
 * Only password-generator icons are managed; username, TOTP, autofill and
 * KeePassXC-connection code have been removed.
 */
const kpxcIcons = {};
kpxcIcons.icons = [];
kpxcIcons.iconTypes = {
    DEFAULT: 0,
    PASSWORD: 1,
    TOTP: 2,
};

kpxcIcons.calculateIconOffset = function(field, size) {
    const offset = Math.floor((field.offsetHeight / 2) - (size / 2) - 1);
    return (offset < 0) ? 0 : offset;
};

kpxcIcons.hasIcon = function(field) {
    return !field ? false : kpxcIcons.icons.some(i => i.field === field);
};

// Delete all icons that are no longer visible
kpxcIcons.deleteAllHiddenIcons = function() {
    kpxcIcons.deleteIcons(kpxcPasswordIcons.icons);
};

kpxcIcons.deleteIcons = function(iconList) {
    const deletedInputs = [];
    for (const icon of iconList) {
        if (icon.inputField && !kpxcFields.isVisible(icon.inputField)) {
            icon.removeIcon();
            iconList.splice(iconList.indexOf(icon), 1);
            deletedInputs.push(icon.inputField);

            const idx = kpxc.inputs.indexOf(icon.inputField);
            if (idx >= 0) {
                kpxc.inputs.splice(idx, 1);
            }
        }
    }

    for (const input of deletedInputs) {
        const idx = kpxcIcons.icons.findIndex(e => e.field === input);
        if (idx >= 0) {
            kpxcIcons.icons.splice(idx, 1);
        }
    }
};

kpxcIcons.monitorIconPosition = function(iconClass) {
    window.addEventListener('resize', function() {
        kpxcIcons.updateIconPosition(iconClass);
    });

    window.addEventListener('scroll', function() {
        kpxcIcons.updateIconPosition(iconClass);
    });

    window.addEventListener('transitionend', function(e) {
        if (matchesWithNodeName(e.target, 'INPUT') || matchesWithNodeName(e.target, 'TEXTAREA')) {
            kpxcIcons.updateIconPosition(iconClass);
        }
    });
};

kpxcIcons.setIconPosition = function(icon, field, rtl = false, segmented = false) {
    const rect = field.getBoundingClientRect();
    const size = Number(icon.getAttribute('size'));
    const offset = kpxcIcons.calculateIconOffset(field, size);
    const zoom = kpxcUI.bodyStyle?.zoom || 1;
    let left = kpxcUI.getRelativeLeftPosition(rect) / zoom;
    const top = kpxcUI.getRelativeTopPosition(rect) / zoom;

    if (segmented) {
        left += size + 10;
    }

    const scrollTop = kpxcUI.getScrollTop() / zoom;
    const scrollLeft = kpxcUI.getScrollLeft() / zoom;
    icon.style.top = Pixels(top + scrollTop + offset + 1);
    icon.style.left = rtl
        ? Pixels(left + scrollLeft + offset)
        : Pixels(left + scrollLeft + field.offsetWidth - size - offset);
};

kpxcIcons.updateFromIntersectionObserver = function(iconClass, entries) {
    for (const entry of entries) {
        const r = entry.boundingClientRect;
        const rectValues = [ r.bottom, r.height, r.left, r.right, r.top, r.width, r.x, r.y ];

        if ((entry.intersectionRatio === 0 && !entry.isIntersecting) || rectValues.some(x => x < -10)) {
            iconClass.icon.style.display = 'none';
        } else if (entry.intersectionRatio > 0 && entry.isIntersecting) {
            iconClass.icon.style.display = 'block';
            setTimeout(() => {
                kpxcIcons.setIconPosition(iconClass.icon, entry.target, iconClass.rtl, iconClass.segmented);
            }, 400);
        }
    }
};

kpxcIcons.updateIconPosition = function(iconClass) {
    if (iconClass.inputField && iconClass.icon) {
        kpxcIcons.setIconPosition(iconClass.icon, iconClass.inputField, iconClass.rtl, iconClass.segmented);
    }
};
