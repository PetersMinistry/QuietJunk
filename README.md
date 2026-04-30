# QuietJunk

Silently clears your spam. No noise. No clutter.

QuietJunk is a Thunderbird add-on for people who do not want spam folders nagging them with fake unread counts. When Thunderbird identifies a folder as junk, QuietJunk quietly marks unread spam as read so the rest of your inbox can stay honest.

It does not delete mail, move mail, score messages, upload anything, or try to replace your spam filter. It simply cleans up the unread noise after Thunderbird has already decided something belongs in junk.

Current beta build: `0.0.5`

## What It Does

- Marks unread junk mail as read automatically.
- Cleans existing unread junk when Thunderbird starts.
- Keeps watching while Thunderbird stays open or minimized.
- Includes a manual cleanup button for quick testing or backup cleanup.
- Supports account exclusions for inboxes you want QuietJunk to leave alone.
- Shows a simple cleaned-count and recent cleanup summary in the options page.

## What It Does Not Do

- It does not delete messages.
- It does not move messages to trash.
- It does not scan message contents outside Thunderbird's local extension APIs.
- It does not send mail data anywhere.
- It does not promise provider-specific Gmail spam behavior yet.

## Supported Baseline

QuietJunk is built for Thunderbird folders that expose real junk metadata through Thunderbird. If Thunderbird recognizes the folder as junk, QuietJunk can usually clean up the unread count. Provider-specific spam folders, especially Gmail, may behave differently and are still considered best-effort during beta.

## Options

The add-on preferences page includes:

- enable or disable QuietJunk
- mark existing junk on startup
- startup cleanup delay
- duplicate-processing guard window
- account exclusions
- cleanup counter and reset
- manual cleanup
- optional diagnostic logging

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
- `CHANGELOG.md`
- `PRIVACY.md`
- `ROADMAP.md`
