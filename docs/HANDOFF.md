# QuietJunk Handoff

Last updated: 2026-04-30

## Project Summary

QuietJunk is a Thunderbird MailExtension (Manifest V3) that quietly marks junk mail as read so spam stops inflating unread counts.

Repo baseline now considered stable for local use:

- current beta build is `0.0.5`
- current beta package is `dist/QuietJunk-0.0.5.xpi`
- packaged `.xpi` installs correctly
- options UI loads correctly from the packaged build
- startup cleanup works in Thunderbird
- manual cleanup works in Thunderbird
- live counter and cleanup history updates work in the options page
- active incoming-spam stabilization is the current priority before new features
- runtime cleanup now has a folder-level fallback for cases where the visible junk unread count and message query results disagree

Current public-facing manifest description:

- Silently clears your spam. No noise. No clutter.

## Current Supported Behavior

QuietJunk is currently intended to support:

- Thunderbird accounts and folders that expose real junk-folder metadata
- automatic mark-as-read on new junk mail
- mark-as-read when messages are moved into junk after arrival
- mark-as-read when Thunderbird updates a message to junk in place
- mark-as-read when junk folder info/counts change
- startup cleanup after a configurable delay
- a quiet recurring watchdog scan that catches missed unread junk cases
- an active runtime patrol that rescans supported junk folders every 20 seconds while enabled
- folder-level mark-as-read fallback for Thunderbird-recognized junk folders
- manual cleanup from the options page
- account-level exclusions

QuietJunk is not currently claiming support for:

- Gmail-specific spam handling quirks
- folder-name guessing like `Spam` or `Junk` without Thunderbird junk metadata

For now, Gmail should be treated as:

- unsupported or partially supported pending future investigation

That is an intentional product/safety choice, not a forgotten bugfix.

## Current State

The extension now includes:

- background listener registration for new mail
- junk-folder detection across accounts using Thunderbird metadata
- automatic mark-as-read behavior for unread junk messages
- startup junk scan with configurable debounce
- enable/disable toggle
- account-level exclusions
- debug logging toggle
- duplicate-processing guard window
- running cleanup counter
- manual cleanup trigger
- last cleanup summary
- capped recent cleanup history
- account-aware diagnostics in debug logging
- shared mission engine for startup, manual, live-event, folder-info, watchdog, and active-patrol cleanup
- folder-level `folders.markAsRead()` fallback when a junk folder reports unread messages that message queries do not clear
- options UI with Settings and About tabs
- packaged XPI build flow

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
- `dist/`
- `package-xpi.ps1`
- `.gitignore`
- `docs/HANDOFF.md`
- `CHANGELOG.md`
- `PRIVACY.md`
- `ROADMAP.md`
- `TESTING.md`
- `RELEASE_CHECKLIST.md`

## How The Extension Currently Works

### Live Mail Flow

- `messages.onNewMailReceived` is registered from `src/background.js`
- `messages.onMoved` is registered to catch messages that land in junk after later filters move them
- `messages.onUpdated` is registered conservatively to catch in-place junk updates
- `folders.onFolderInfoChanged` is registered to catch unread-count changes on junk folders when message-level events are unreliable
- live events are passed through the spam handler
- only folders exposed by Thunderbird as junk folders are processed
- unread messages are marked as read
- if a junk folder reports unread messages but the message-level query/update path does not clear them, QuietJunk uses `folders.markAsRead(folder.id)` as a safety fallback
- recently processed message IDs are cached temporarily after successful updates to reduce duplicate handling during event bursts

### Startup Scan Flow

- startup scan scheduling is handled in `src/background.js`
- if enabled, QuietJunk schedules an alarm using the Thunderbird alarms API
- startup scheduling is triggered on background load, startup, install, and relevant settings changes
- after the configured `startupDebounceMs`, `processExistingUnreadJunk()` scans discovered junk folders
- QuietJunk now also schedules staggered startup retry scans after the first launch pass to catch junk folders that appear later during startup
- startup scans trust the junk folder location and query unread messages in that folder, instead of relying on the per-message `junk` flag
- unread junk messages found during startup are marked as read

### Watchdog Scan Flow

- a recurring background alarm runs while the extension is enabled
- it performs a quiet unread-junk sweep once per minute
- it is meant to catch missed live-event cases while Thunderbird stays open or minimized
- it uses the folder-level fallback when folder unread counts prove there is still visible spam noise to clear
- it does not write to the visible cleanup summary/history feed unless it actually clears messages

### Active Patrol Flow

- an internal timer also runs while QuietJunk is enabled
- it performs a quiet unread-junk sweep every 20 seconds
- it exists because real-world testing showed unread spam could remain visible for more than five minutes even after the alarm watchdog build
- it uses the same scan engine and folder-level fallback as manual/startup/watchdog cleanup
- it stays out of visible cleanup history unless it actually marks spam read

### Manual Cleanup Flow

- the options UI can request an immediate cleanup run
- manual cleanup uses the same scan logic as startup cleanup
- manual cleanup is allowed even if the startup-only toggle is disabled
- the options page now reflects cleanup results live without needing a manual refresh

### Settings Storage

Stored in `browser.storage.local` via `src/settings.js`:

- `enabled`
- `debug`
- `excludedAccountIds`
- `markExistingOnStartup`
- `startupDebounceMs`
- `watchdogIntervalMs`
- `activePatrolIntervalMs`
- `processedMessageTtlMs`
- `totalMarkedRead`
- `lastCleanupSummary`
- `cleanupHistory`

## Diagnostics Notes

When debug logging is enabled, QuietJunk now records:

- which trigger fired: new-mail, moved-to-junk, junk-updated, folder-info-changed, startup-scan, startup-retry, manual-scan, watchdog-scan, or active-patrol
- account name and account id
- folder path/name, folder type, and `specialUse` metadata
- whether a folder was skipped because it was not recognized as junk
- whether unread messages were seen but not updated
- whether cleanup used the normal message-query strategy or the folder-level `markAsRead` fallback

This is the main tool for comparing a working spam folder against a non-working one during shakeout.

## Packaging Flow

Packaging now lives in:

- `package-xpi.ps1`
- `dist/`

Current packaging notes:

- packaging uses native Windows zip APIs from PowerShell/.NET
- `dist/QuietJunk-0.0.5.xpi` has been built successfully in this repo
- `dist/QuietJunk-0.0.4.xpi` is kept as the previous stabilization rollback beta until `0.0.5` is confirmed usable
- a packaging bug was fixed where Windows-style backslashes inside the archive broke icons and options assets
- the packager now writes proper zip entry paths like `ui/options.html`

## Implemented vs Planned

### Implemented

- Phase 1 core listener and read-marking behavior
- expanded live-event coverage for moved and updated junk messages
- folder-info change handling for junk folders
- folder-level mark-as-read fallback for visible unread junk counts
- startup cleanup with alarms-based scheduling
- manual cleanup
- live cleanup diagnostics
- quiet watchdog scan fallback
- active runtime patrol fallback
- Phase 2 minimal options UI
- Phase 2 enable/disable
- Phase 2 account-level exclusions
- Phase 2 local storage-backed settings
- Phase 3 startup debounce
- Phase 3 duplicate-processing guard
- Phase 3 debug logging mode
- local packaging flow and `dist` output

### Not Implemented Yet

- folder-level exclusions
- dedicated queue or processing manager
- `queue.js`
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
2. Introduce a proper queue / processing manager for burst handling.
3. Improve cleanup summary readability for multi-account runs by showing account + folder labels more clearly.
4. Investigate Gmail only if a safe metadata-based path becomes clear.

## Validation Status

Confirmed in this workspace:

- manifest parses successfully
- `src/background.js` syntax check passed
- `src/spamHandler.js` syntax check passed
- `ui/options.js` syntax check passed
- the native packaging script built `dist/QuietJunk-0.0.5.xpi`
- the packaged build was re-tested after the archive path fix
- startup cleanup worked in Thunderbird
- manual cleanup worked in Thunderbird
- live counter/history repaint worked in Thunderbird
- `0.0.5` was built after active-patrol stabilization code and package-version verification

Not yet confirmed in this workspace:

- full Gmail spam behavior
- folder exclusion behavior because folder exclusions are not built yet
- queue behavior under heavy burst conditions

## Notes For Future Conversations

- Keep this handoff updated as a living history and project status log, not just static setup notes.
- Do not broaden junk detection with simple folder-name guessing unless there is a clearly safe reason.
- Gmail is intentionally not part of the current supported baseline.
- Use `TESTING.md` and `RELEASE_CHECKLIST.md` as the default operational docs for future validation and packaging passes.
