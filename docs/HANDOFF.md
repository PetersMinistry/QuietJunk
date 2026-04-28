# QuietJunk Handoff

Last updated: 2026-04-27

## Project Summary

QuietJunk is a Thunderbird MailExtension (Manifest V3) designed to silently reduce false unread noise by automatically marking junk messages as read.

Current tagline:

- Silently clears your spam. No noise. No clutter.

## Current State

The extension is beyond the original zero-UI MVP and now includes:

- background listener registration for new mail
- junk-folder detection across accounts
- automatic mark-as-read behavior for unread junk messages
- startup junk scan with configurable debounce
- enable/disable toggle
- account-level exclusions
- debug logging toggle
- duplicate-processing guard window
- running cleanup counter
- counter reset action
- options UI with Settings and About tabs

## Current File Map

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

## How The Extension Currently Works

### New Mail Flow

- `messages.onNewMailReceived` is registered from `src/background.js`
- new mail events are passed to `handleNewMailEvent`
- only junk folders are processed
- unread messages are marked as read
- recently processed message IDs are cached temporarily to reduce duplicate handling during event bursts

### Startup Scan Flow

- startup scan scheduling is handled in `src/background.js`
- if enabled, QuietJunk schedules an alarm using the Thunderbird alarms API
- startup scheduling is triggered on background load, startup, install, and relevant settings changes
- after the configured `startupDebounceMs`, `processExistingUnreadJunk()` scans discovered junk folders
- startup scans now trust the junk folder location and query unread messages in that folder, instead of relying on the per-message `junk` flag
- unread junk messages found during startup are marked as read

### Manual Cleanup Flow

- the options UI can request an immediate cleanup run
- manual cleanup uses the same scan logic as startup cleanup
- manual cleanup is allowed even if the startup-only toggle is disabled

### Settings Storage

Stored in `browser.storage.local` via `src/settings.js`:

- `enabled`
- `debug`
- `excludedAccountIds`
- `markExistingOnStartup`
- `startupDebounceMs`
- `processedMessageTtlMs`
- `totalMarkedRead`

## Implemented vs Planned

### Implemented

- Phase 1 core listener and read-marking behavior
- Phase 2 minimal options UI
- Phase 2 enable/disable
- Phase 2 account-level exclusions
- Phase 2 local storage-backed settings
- Phase 3 startup debounce
- Phase 3 duplicate-processing guard
- Phase 3 debug logging mode

### Not Implemented Yet

- folder-level exclusions
- dedicated queue or processing manager
- `queue.js`
- `messages.onMoved` handling
- `messages.onUpdated` handling
- auto-delete after X days
- auto-move to trash
- domain-based filtering
- rule engine
- rule configuration UI
- daily cleanup summary
- badge with cleaned count
- notifications
- cross-extension integration

## Known Gaps / Next Best Work

Highest-value next steps:

1. Add folder-level exclusions.
2. Add `messages.onMoved` support for messages that are classified or moved after receipt.
3. Introduce a proper queue / processing manager for burst handling.
4. Improve branding hierarchy in the options header so `QuietJunk` leads more clearly than the descriptive tagline.
5. Integrate the final logo once provided.
6. Investigate Gmail spam behavior if Gmail junk remains inconsistent while other accounts are working.

## Validation Status

Confirmed in this workspace:

- manifest parses successfully
- `src/background.js` syntax check passed
- `src/spamHandler.js` syntax check passed
- `ui/options.js` syntax check passed

Not yet confirmed in this workspace:

- full Thunderbird runtime behavior across real junk events
- startup scan behavior across actual restarts
- account exclusion behavior in live Thunderbird profiles
- multi-account and high-volume IMAP scenarios
- Gmail spam-folder behavior may still differ from other providers and should be treated as an open compatibility check

## Notes For Future Conversations

- The product name should likely be visually promoted over the descriptive line in the top preferences hero.
- The user plans to provide a logo later for integration into the options UI.
- Keep this handoff updated as a living history and project status log, not just static setup notes.
- Use `TESTING.md` and `RELEASE_CHECKLIST.md` as the default operational docs for future validation and packaging passes.
