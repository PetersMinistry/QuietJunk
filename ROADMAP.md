# Roadmap

## Current Stage

QuietJunk is between the original MVP and early stability/configuration work.

Current stable baseline:

- packaged local XPI works
- startup/manual cleanup works for supported Thunderbird junk folders
- Gmail is intentionally not part of the supported baseline right now

## Near Term

### 1. Live Validation

- keep validating new junk delivery behavior in Thunderbird
- keep validating startup cleanup after restart
- test multiple accounts
- test excluded-account behavior
- leave Gmail alone unless support is intentionally reopened later

### 2. Control Improvements

- add folder-level exclusions
- improve cleanup summary clarity for multi-account runs

### 3. Stability Improvements

- add `messages.onMoved` support
- add `messages.onUpdated` support if needed
- introduce a queue / processing manager for burst handling
- tune large-volume behavior

## Longer Term

### Automation

- auto-delete junk after X days
- auto-move junk to trash
- domain-based filtering
- rule engine

### UX

- badge with cleaned count
- daily cleanup summary
- optional notifications

### Ecosystem

- potential integration with related Thunderbird workflow tools
- explore unified inbox hygiene tooling
