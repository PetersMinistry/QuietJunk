# Changelog

All notable changes to QuietJunk should be recorded here.

## [Unreleased]

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
- Basic SVG icon set.
- Project docs set including handoff, roadmap, and privacy policy.

### Changed

- Extended the project past the original zero-UI MVP into control and stability work.
- Added UI controls for startup debounce, duplicate guard timing, and cleanup counter reset.

### Pending

- Folder-level exclusions.
- Event coverage for moved or updated messages.
- Queue / processing manager.
- Branding pass with final logo.
