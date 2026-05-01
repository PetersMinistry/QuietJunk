# Roadmap

## Current Stage

QuietJunk `0.0.5` is a stable beta. The core mission is working in real use: supported Thunderbird junk folders are being marked read during startup, manual cleanup, and normal all-day runtime use.

Current baseline:

- packaged XPI works
- startup cleanup works
- manual cleanup works
- runtime cleanup works while Thunderbird stays open or minimized
- account exclusions and basic options are in place
- Gmail spam folders are not a supported target right now

## Near Term

### 1. Stable Beta Shakeout

- keep running `0.0.5` in normal use
- watch for any supported junk folder that still shows unread spam
- collect provider/account notes before changing behavior again
- keep Gmail-specific work out of scope unless intentionally reopened later

### 2. Control Improvements

- add folder-level exclusions
- improve cleanup summary clarity for multi-account profiles

### 3. Stability Improvements

- introduce a queue / processing manager for burst handling
- tune large-volume behavior
- improve diagnostics if a supported folder misses cleanup

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
