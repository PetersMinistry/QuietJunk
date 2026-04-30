# Changelog

All notable changes to QuietJunk should be recorded here.

Current shipped build:

- version: `0.0.3`
- packaged artifact: `dist/QuietJunk-0.0.3.xpi`

## [Unreleased]

### Planned Next Version

- next suggested version: `0.0.4`

### Beta Milestone Notes

- `0.0.4` should represent the next beta-level stabilization checkpoint.
- `0.0.4` should be titled active incoming spam stabilization once the current runtime pass is confirmed in Thunderbird.
- The stabilization goal is simple: incoming spam in supported junk folders should be marked read while Thunderbird stays open and minimized.
- Startup cleanup, manual cleanup, folder-info triggers, moved/updated-message triggers, and the watchdog scan now feed the same cleanup engine.
- Remaining proof work is real-world provider/account consistency, especially comparing the previously working spam box against the previously failing one.
- Added a folder-level `folders.markAsRead()` fallback for junk folders whose unread count is visible to Thunderbird but whose unread messages are not cleared by message query/update.

## [0.0.3] - 2026-04-28

### Added

- Initial Thunderbird MailExtension MV3 scaffold with `manifest.json`, background entry point, and spam handler.
- Automatic unread-junk cleanup for new mail events.
- Startup junk scan with configurable debounce timing.
- Settings storage module backed by `browser.storage.local`.
- Debug logging support.
- Account-level exclusions.
- Duplicate-processing guard window to reduce repeated handling during sync bursts.
- Cleanup counter with reset action.
- Minimal options UI with Settings and About tabs.
- Cleanup diagnostics with manual run support and a capped recent-run history.
- Packaging setup with `dist/`, `.gitignore`, and `package-xpi.ps1`.
- Project docs set including handoff, roadmap, and privacy policy.

### Changed

- Extended the project past the original zero-UI MVP into control and stability work.
- Added UI controls for startup debounce, duplicate guard timing, and cleanup counter reset.
- Switched startup cleanup scheduling from `setTimeout` to the alarms API and added explicit startup/install listeners to improve startup reliability.
- Changed startup scanning to trust the junk folder location itself instead of requiring the per-message `junk` flag.
- Added a manual cleanup path that can run independently of the startup-only toggle.
- Reworked the options UI with the final PNG logo set, tighter account controls, live counter/history updates, and more natural user-facing copy.
- Fixed the options page so storage-backed values repaint live instead of requiring a manual refresh.
- Fixed the options page hydration race that could briefly show toggles off and timing inputs blank on install.
- Built the release packaging flow around the native Windows zip APIs instead of an external archiver dependency.
- Fixed the XPI packaging path bug so packaged assets use valid forward-slash archive paths and load correctly in Thunderbird.
- Expanded live cleanup coverage to also watch messages moved into junk folders and messages updated to junk in place.
- Added a quiet recurring maintenance scan so unread junk gets corrected even when Thunderbird misses a live event path.
- Improved diagnostics so debug logging now reports account-aware folder metadata and trigger paths for junk handling.
- Added staggered startup retry scans so junk folders that appear later during launch still get a cleanup pass.
- Added folder unread-count change handling so junk folders can trigger cleanup even when message events are unreliable.
- Refactored cleanup into a mission-oriented scan engine shared by startup, manual, live-event, folder-info, and watchdog paths.
- Added an internal one-minute watchdog interval so supported junk folders are rescanned while Thunderbird is running.
- Tightened duplicate-guard behavior so only successfully updated messages are remembered during burst protection.
- Added the `accountsFolders` permission so supported junk folders can be marked read at the folder level when the message-level path misses visible unread spam.

### Pending

- Folder-level exclusions.
- Queue / processing manager.
- Gmail spam compatibility investigation if Gmail remains inconsistent with other providers.
