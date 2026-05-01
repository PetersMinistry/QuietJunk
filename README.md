# QuietJunk

Quiet help for messy inboxes.

QuietJunk is a Thunderbird add-on that keeps spam from messing with your unread count. When Thunderbird recognizes mail as junk, QuietJunk quietly marks it as read so your real inbox can stop sharing attention with the junk drawer.

It is intentionally small: no deleting, no moving, no cloud service, no message scoring, no drama. Thunderbird decides what is junk. QuietJunk just cleans up the little unread badge that junk leaves behind.

![QuietJunk options screen](assets/screenshots/options-0.0.5.png)

## Status

Current build: `0.0.5 Stable Beta`

This build has passed real-world overnight/runtime testing in Thunderbird. Startup cleanup, manual cleanup, and ongoing spam cleanup while Thunderbird stays open have all been working solidly in normal use.

QuietJunk is still labeled beta because provider behavior can vary, especially around Gmail-style spam folders. The core supported Thunderbird junk-folder workflow is stable enough for broader testing.

## Function

- Marks unread junk mail as read automatically.
- Cleans existing unread junk when Thunderbird starts.
- Keeps watching junk folders while Thunderbird stays open or minimized.
- Provides a manual cleanup button when you want to bonk the count right now.
- Lets you exclude accounts that should stay untouched.
- Shows a quiet count of how much inbox noise it has cleaned up.

## Boundaries

- It does not delete messages.
- It does not move messages to trash.
- It does not classify spam itself.
- It does not send mail data anywhere.
- It does not promise provider-specific Gmail spam behavior.

## Support Baseline

QuietJunk works best with Thunderbird folders that Thunderbird itself exposes as junk folders. Most normal junk folders should behave cleanly. Provider-specific spam folders can be weird and remain best-effort during beta.

## Options

The add-on preferences page includes:

- enable or disable QuietJunk
- mark existing junk on startup
- startup cleanup delay
- duplicate-processing guard window
- account exclusions
- quiet count and reset
- manual cleanup
- optional diagnostic logging

## Privacy

QuietJunk runs locally inside Thunderbird. It uses Thunderbird extension APIs to find supported junk folders and mark unread junk messages as read. It does not collect analytics, transmit message data, or use an external service.
