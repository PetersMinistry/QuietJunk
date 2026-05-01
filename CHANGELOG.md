# Changelog

All notable changes to QuietJunk should be recorded here.

Current shipped build:

- version: `0.0.5`
- release artifact: `QuietJunk-0.0.5.xpi`

## [Unreleased]

### Planned Next Version

- next suggested version: `0.0.6`

## [0.0.5] - 2026-04-30

Active patrol stabilization beta. This build responds to real-world testing where spam could arrive while Thunderbird stayed open and remain unread for more than five minutes even after the watchdog build.

### Added

- Added an internal `active-patrol` runtime sweep that rescans supported junk folders every 20 seconds while QuietJunk is enabled.
- Added an `activePatrolIntervalMs` default setting so the patrol interval can be tuned later without adding more UI clutter now.

### Changed

- Kept the one-minute alarm watchdog as a backup, but no longer depends on alarms alone for all-day minimized Thunderbird runtime cleanup.
- Runtime patrol scans stay quiet in visible history unless they actually mark spam read.

### Beta Notes

- This is the build to test against the exact failure case: Thunderbird already open, minimized, spam arrives, unread count appears, and no manual cleanup is used.
- Expected behavior: supported spam should clear within about 20-40 seconds. If it does not, the next diagnostics target is proving whether the background patrol is running and whether the folder is discoverable during that pass.
- This is the stable-beta release candidate for supported Thunderbird junk folders.
- Gmail spam folders are not a supported target right now; exclude Gmail accounts if their spam is already quiet in Thunderbird.

## [0.0.4] - 2026-04-30

Active incoming spam stabilization beta. This build is meant to prove that unread spam which appears while Thunderbird is already open gets cleared by live triggers, folder-info changes, or the watchdog fallback.

### Added

- Added a folder-level `folders.markAsRead()` fallback for junk folders whose unread count is visible to Thunderbird but whose unread messages are not cleared by message query/update.
- Added `accountsFolders` permission so supported junk folders can be marked read at the folder level when the message-level path misses visible unread spam.

### Changed

- Refactored cleanup into a mission-oriented scan engine shared by startup, manual, live-event, folder-info, and watchdog paths.
- Added an internal one-minute watchdog interval so supported junk folders are rescanned while Thunderbird is running.
- Tightened duplicate-guard behavior so only successfully updated messages are remembered during burst protection.

### Beta Notes

- Focus testing on incoming spam that appears after Thunderbird has already been running for several minutes.
- If live triggers miss the message, the watchdog should clear it in about 60-90 seconds.
- Gmail spam folders are out of scope unless intentionally reopened later.
- Keep the previous `0.0.3` package as a local rollback package until `0.0.4` is confirmed usable.

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
- Local packaging setup and repository ignore rules for generated XPI files.
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

### Pending

- Folder-level exclusions.
- Queue / processing manager.
- Gmail spam compatibility investigation only if Gmail support is intentionally reopened.
