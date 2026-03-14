# Password Generator (generator-only fork of KeePassXC-Browser)

> **⚠️ Generator-Only Fork** — This is a stripped-down variant of
> [KeePassXC-Browser](https://github.com/keepassxc/keepassxc-browser) that
> **only provides the local password generator**.  All KeePassXC connection,
> database, autofill and native-messaging features have been removed.
> No connection to KeePassXC is required or attempted.

## What this does

- Injects a 🔑 key icon next to every `<input type="password">` field on web pages.
- Clicking the icon opens a lightweight generator panel (Shadow DOM, isolated from page styles) where you can:
  - Set password **length** (default: 16)
  - Toggle **include symbols** (default: on)
  - Toggle **exclude similar characters** (default: off)
  - Click **Regenerate** to get a new password
  - Click **Use** to fill the password field (fires `input` and `change` events)
  - Click **Close** to dismiss
- Keyboard shortcut **Alt+Shift+G** (Windows/Linux) / **Ctrl+Shift+G** (macOS) opens the panel for the focused password field.
- Passwords are generated locally using `crypto.getRandomValues` — no network requests, no background service, no stored credentials.

## Permissions

This fork requests **no special browser permissions**.  The extension only injects a content script into web pages to add the generator UI.

## Building / loading unpacked

```bash
npm install
npm run build     # or: npm run dev
```

Then in Chrome/Chromium → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `keepassxc-browser/` directory.

---

*Original project: [keepassxc/keepassxc-browser](https://github.com/keepassxc/keepassxc-browser)*

## Requested permissions

KeePassXC-Browser extension requests the following permissions:

| Name  | Reason |
| ----- | ----- |
| `activeTab`               | To get URL of the current tab |
| `contextMenus`            | To show context menu items |
| `cookies`                 | To access browser's internal Public Suffix List |
| `clipboardWrite`          | Allows password to be copied from password generator to clipboard |
| `nativeMessaging`         | Allows communication with KeePassXC application |
| `notifications`           | To show browser notifications |
| `offscreen`               | For accessing system theme when setting icon colors (Chrome only) |
| `privacy`                 | For setting the extension as default password manager |
| `storage`                 | For storing extension settings (always stored locally in the browser, they are never synced) |
| `tabs`                    | To request tab URL's and other info |
| `webNavigation`           | To show browser notifications on install or update |
| `webRequest`              | For handling HTTP Basic Auth |
| `webRequestAuthProvider`  | For handling HTTP Basic Auth for Chromium based browsers |
| `webRequestBlocking`      | For handling HTTP Basic Auth |
| `http://*/*`              | To allow using KeePassXC-Browser on all websites |
| `https://*/*`             | To allow using KeePassXC-Browser on all websites |
| `https://api.github.com/` | For checking the latest KeePassXC version from GitHub |

## Protocol

Check [keepassxc-protocol](keepassxc-protocol.md) for the details about the messaging protocol used between the browser extension and KeePassXC.

## Translations

Translations are managed on [Transifex](https://explore.transifex.com/keepassxc/keepassxc-browser/) which offers a web interface. Please join an existing language team or request a new one if there is none.

## Contributing

You may directly contribute your own code by submitting a pull request. Please read the [CONTRIBUTING](.github/CONTRIBUTING.md) document for further information.

## Development and testing

See [wiki](https://github.com/keepassxreboot/keepassxc-browser/wiki/Loading-the-extension-manually).

## Help!

See our [Troubleshooting Guide](https://github.com/keepassxreboot/keepassxc-browser/wiki/Troubleshooting-guide) for solving problems if previously listed issues and solutions are not working.
