# QuietJunk

Silently clears your spam. No noise. No clutter.

## Current MVP

- Watches new mail events across folders
- Detects junk-folder deliveries
- Marks unread junk messages as read
- Includes settings for enable/disable, debug logging, startup cleanup, account exclusions, and a cleanup counter
- Uses Thunderbird's Add-ons Manager preferences surface as a polished settings and about experience

## Local Testing

1. Open Thunderbird.
2. Go to the Add-ons Manager debug page.
3. Choose `Load Temporary Add-on`.
4. Select `manifest.json` from this folder.
5. Open the add-on Preferences view to confirm the Settings and About tabs render correctly.
6. Send or move a test message into Junk and watch the extension console.

## Project Structure

- `manifest.json`
- `src/background.js`
- `src/spamHandler.js`
- `src/settings.js`
- `src/logger.js`
- `ui/options.html`
- `ui/options.css`
- `ui/options.js`
- `icons/`
