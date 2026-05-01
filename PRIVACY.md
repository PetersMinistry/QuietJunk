# Privacy Policy

Last updated: 2026-05-01

## Summary

QuietJunk runs locally inside Mozilla Thunderbird and quietly marks supported junk-folder messages as read. It does not require an external account, remote server, cloud sync service, analytics service, or tracking service.

## Data QuietJunk Accesses

QuietJunk may access:

- Thunderbird account metadata needed to discover junk folders
- message metadata needed to identify and update junk messages
- locally stored extension settings

## Data QuietJunk Stores

QuietJunk stores the following settings locally using Thunderbird extension storage:

- whether the extension is enabled
- whether debug logging is enabled
- excluded account IDs
- whether startup cleanup is enabled
- startup debounce timing
- duplicate guard timing
- active cleanup timing
- running cleanup counter
- recent cleanup summary/history shown in the options page

This data is stored locally in the Thunderbird profile through extension storage.

## What QuietJunk Does Not Do

QuietJunk does not:

- send message content to external servers
- upload account data
- create a remote user account
- sell or share user data
- use analytics, ads, or tracking scripts
- read passwords, payment information, or address book data

## Message Handling

QuietJunk is intended to:

- detect junk-folder messages
- mark unread junk messages as read

It does not move, delete, forward, reply to, or classify messages on its own beyond the read-state change described above.

## Future Features

If future versions add actions such as deletion, notifications, summaries, rules, or any remote service, this privacy policy should be updated before release.

## Project Status

QuietJunk `0.0.5` is a stable beta. The supported Thunderbird junk-folder workflow is designed to stay local and privacy-safe. Gmail spam folders are not a supported target right now because Gmail often handles spam unread counts differently.
