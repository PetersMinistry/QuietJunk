# Plan1.md: Make QuietJunk Reliably Mark Incoming Spam As Read

## Mission

QuietJunk has one essential job: when Thunderbird exposes mail as junk/spam, QuietJunk marks it read so spam does not inflate unread counts.

Manual cleanup and startup cleanup already prove the extension can discover supported junk folders and update messages. The weak point has been active runtime behavior while Thunderbird is open for the day. This plan makes that runtime path the primary stabilization target.

## Strategy

QuietJunk should not depend on one Thunderbird event being perfect. Every useful signal should feed one shared cleanup engine.

Supported triggers:

- `new-mail`: scan the affected folder when Thunderbird reports new mail.
- `moved-to-junk`: scan destination folders when messages move.
- `junk-updated`: scan the message folder when Thunderbird updates junk state in place.
- `folder-info-changed`: scan a recognized junk folder when Thunderbird reports folder count/info changes.
- `watchdog-scan`: run a recurring quiet scan while QuietJunk is enabled.
- `startup-scan`: scan all discovered junk folders after launch.
- `startup-retry`: run short follow-up scans after startup to catch late-loading IMAP folders.
- `manual-scan`: keep the options-page button as a proof tool and user escape hatch.

All paths should converge on:

- `scanJunkFolder(folder, sourceLabel)`
- `scanAllJunkFolders(sourceLabel, options)`
- `markUnreadMessagesAsRead(folder, messageList, sourceLabel)`

## Safety Boundary

QuietJunk should only act on folders Thunderbird exposes as junk folders.

Supported junk signals:

- `folder.type === "junk"`
- `folder.specialUse` includes `"junk"`

Do not add simple folder-name guessing such as any folder literally named `Spam` or `Junk`. Gmail remains best-effort unless it works naturally through the same metadata-based path.

## Runtime Rules

- Event-triggered cleanup scans only the affected folder when possible.
- Startup, manual, and watchdog cleanup scan all discovered junk folders.
- The watchdog runs every `60000 ms` by default while QuietJunk is enabled.
- The watchdog does not write visible cleanup history unless it actually marks messages read.
- The duplicate guard prevents repeated work during bursts, but it only remembers messages after a successful update.
- A failed update must not suppress future attempts for the same unread message.
- If Thunderbird reports unread messages in a supported junk folder but message query/update does not clear them, use `folders.markAsRead(folder.id)` as the folder-level fallback.

## Diagnostics

Debug logging must make failures explainable.

Each cleanup result should include:

- trigger/source label
- account name and account id
- folder id, name/path, type, and `specialUse`
- scanned message count
- unread message count
- updated message count
- skip reason, if any
- cleanup strategy: `message-query` or `folder-markAsRead`
- update errors, if any
- timestamp

After this pass, a failure should fit one of these buckets:

- Thunderbird did not expose the folder as junk.
- Thunderbird exposed the folder as junk but did not fire an event.
- An event fired before messages were queryable.
- Query found unread messages but `messages.update()` failed.
- Account was excluded.
- Folder was virtual, unified, tagged, or otherwise not scannable.
- Provider-specific behavior needs a separate strategy.

## Acceptance Criteria For 0.0.4

The next beta milestone is `0.0.4`.

It is earned when:

- a fresh incoming spam message in the previously failing non-Gmail inbox is marked read without manual cleanup
- if immediate event cleanup misses it, the watchdog clears it within the fallback window
- debug logs identify the path that cleared it
- manual cleanup still works
- startup cleanup still works
- packaged XPI loads cleanly

Until those are true, remain on `0.0.3` and keep treating this as stabilization work.

## Required Checks

Before each packaged test build:

- parse `manifest.json`
- syntax check `src/background.js`
- syntax check `src/spamHandler.js`
- syntax check `ui/options.js`
- run `package-xpi.ps1`
- inspect the XPI archive paths for forward slashes such as `ui/options.html` and `icons/icon-96.png`

## Current Decision

The project should prioritize this mission over enhancements. No folder exclusions, UI polish, counters, or future features matter until incoming spam is reliably marked read during normal all-day Thunderbird use.
