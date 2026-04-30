# Testing Guide

Last updated: 2026-04-29

## Goal

Validate that QuietJunk behaves correctly in real Thunderbird environments before packaging or release.

Current supported test target:

- Thunderbird accounts/folders that expose real junk metadata

Current out-of-scope or best-effort target:

- Gmail spam behavior, unless later testing proves there is a safe metadata-based path

## Basic Setup

1. Open Thunderbird.
2. Go to the Add-ons Manager debug page.
3. Choose `Load Temporary Add-on`.
4. Select `manifest.json` from the QuietJunk project folder.
5. Open the extension preferences screen.

## Core Validation Scenarios

### 1. Preferences Load

Confirm:

- the preferences page opens
- the packaged `.xpi` shows the proper icon
- the Settings and About tabs switch correctly
- current values load without errors
- the cleanup counter renders
- the startup timing fields are populated with stored/default values

### 2. Settings Persistence

Change one or more values, save them, close the preferences view, then reopen it.

Confirm:

- `enabled` persists
- `debug` persists
- `markExistingOnStartup` persists
- `startupDebounceMs` persists
- `processedMessageTtlMs` persists
- account exclusions persist

### 3. New Junk Mail Arrival

Send or allow an unread test message to arrive in a supported junk folder.

Confirm:

- QuietJunk detects the junk folder
- the message becomes read automatically
- the cleanup counter increments
- the console shows expected log output if debug is enabled
- the debug log clearly identifies the account and folder metadata for the event path
- if message-level events are missed, a junk-folder unread-count change can still trigger cleanup
- if all live-event paths miss it, the watchdog clears it within about one minute
- if the visible folder count says unread spam exists but message query does not clear it, the folder-level fallback clears the junk folder

### 3a. Moved Or Reclassified Junk

Move an unread test message into a supported junk folder, or let Thunderbird classify a message as junk after arrival.

Confirm:

- `moved-to-junk`, `junk-updated`, or `folder-info-changed` appears in debug logging
- the affected junk folder is scanned
- the unread message becomes read without opening the options page

### 3b. Re-Unread Junk Recovery

Take a message that is already sitting in a supported junk folder and manually mark it unread again.

Confirm:

- QuietJunk flips it back to read automatically
- if a live event is missed, the watchdog pass corrects it within about a minute
- if the unread count remains visible after opening the folder, wait one watchdog interval and confirm the folder-level fallback clears it

### 4. Startup Scan

Prepare at least one unread junk message, then restart Thunderbird.

Confirm:

- QuietJunk waits for the configured debounce delay
- startup scan runs
- unread junk mail is marked as read
- if the first startup scan misses a late-loading inbox, one of the startup retries catches it shortly after
- the options page reflects updated count/history without needing a manual refresh if it is already open

### 5. Account Exclusion

Exclude one account in settings and leave another included.

Confirm:

- included account junk mail is processed
- excluded account junk mail is left alone

### 6. Counter Reset

After the counter is above zero:

- open the About tab
- click `Reset cleared count`

Confirm:

- the displayed count returns to `0`
- no visible UI error occurs

### 7. Packaged Build

Install the built XPI from `dist/`.

Confirm:

- the add-on icon renders correctly in Thunderbird
- the Options screen loads correctly from the packaged build
- CSS and JavaScript assets load normally
- packaged behavior matches the temporary add-on behavior

## Higher-Risk Scenarios

These are especially important before calling the extension stable:

- multi-account profiles
- Gmail IMAP junk behavior if that work is intentionally reopened later
- Outlook IMAP junk behavior
- startup with many unread junk messages
- sync bursts with repeated or overlapping events
- offline to reconnect behavior
- messages moved into Junk after initial arrival

## Current Gaps In Live Validation

Not yet confirmed in this workspace:

- folder exclusion behavior because folder exclusions are not built yet
- queue behavior under heavy burst conditions
- Gmail spam behavior may still need provider-specific investigation even when other spam folders work
- provider/account consistency for the previously failing non-Gmail spam box after the watchdog stabilization pass

## Helpful Developer Checks

Current workspace validations already performed:

- manifest parse check passed
- `src/background.js` syntax check passed
- `src/spamHandler.js` syntax check passed
- `ui/options.js` syntax check passed

When comparing a working spam folder to a failing one, enable debug logging and look for:

- trigger path used
- account label / account id
- folder path / folder type / `specialUse`
- whether the folder was recognized as junk
- scanned count, unread count, updated count, and skip reason
- cleanup strategy: `message-query` or `folder-markAsRead`
