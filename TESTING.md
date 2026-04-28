# Testing Guide

Last updated: 2026-04-27

## Goal

Validate that QuietJunk behaves correctly in real Thunderbird environments before packaging or release.

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
- the Settings and About tabs switch correctly
- current values load without errors
- the cleanup counter renders

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

Send or move an unread test message into a junk folder.

Confirm:

- QuietJunk detects the junk folder
- the message becomes read automatically
- the cleanup counter increments
- the console shows expected log output if debug is enabled

### 4. Startup Scan

Prepare at least one unread junk message, then restart Thunderbird.

Confirm:

- QuietJunk waits for the configured debounce delay
- startup scan runs
- unread junk mail is marked as read

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

## Higher-Risk Scenarios

These are especially important before calling the extension stable:

- multi-account profiles
- Gmail IMAP junk behavior
- Outlook IMAP junk behavior
- startup with many unread junk messages
- sync bursts with repeated or overlapping events
- offline to reconnect behavior
- messages moved into Junk after initial arrival

## Current Gaps In Live Validation

Not yet confirmed in this workspace:

- folder exclusion behavior because folder exclusions are not built yet
- moved-message handling via `messages.onMoved`
- updated-message handling via `messages.onUpdated`
- queue behavior under heavy burst conditions
- Gmail spam behavior may still need provider-specific investigation even when other spam folders work

## Helpful Developer Checks

Current workspace validations already performed:

- manifest parse check passed
- `src/background.js` syntax check passed
- `src/spamHandler.js` syntax check passed
- `ui/options.js` syntax check passed
