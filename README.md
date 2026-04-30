# QuietJunk

Silently clears your spam. No noise. No clutter.

Current beta build: `0.0.4`

## Current State

- Watches new mail events across folders
- Detects junk-folder deliveries
- Marks unread junk messages as read
- Uses folder-count and watchdog fallbacks for spam that appears while Thunderbird stays open
- Falls back to Thunderbird's folder-level mark-as-read API when a supported junk folder still shows unread spam
- Includes settings for enable/disable, debug logging, startup cleanup, account exclusions, and a cleanup counter
- Uses a short in-memory duplicate guard to avoid re-processing the same messages during event bursts
- Exposes the duplicate guard window and cleanup counter reset in the options UI
- Uses Thunderbird's Add-ons Manager preferences surface as a polished settings and about experience

## Docs

- [Handoff](B:\Codex Projects\GitHub\QuietJunk\docs\HANDOFF.md)
- [Changelog](B:\Codex Projects\GitHub\QuietJunk\CHANGELOG.md)
- [Privacy Policy](B:\Codex Projects\GitHub\QuietJunk\PRIVACY.md)
- [Roadmap](B:\Codex Projects\GitHub\QuietJunk\ROADMAP.md)
- [Testing Guide](B:\Codex Projects\GitHub\QuietJunk\TESTING.md)
- [Release Checklist](B:\Codex Projects\GitHub\QuietJunk\RELEASE_CHECKLIST.md)

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
- `docs/HANDOFF.md`
- `CHANGELOG.md`
- `PRIVACY.md`
- `ROADMAP.md`
- `TESTING.md`
- `RELEASE_CHECKLIST.md`
