# Security Policy

## Supported Versions

QuietJunk is currently in stable beta.

| Version | Supported |
| --- | --- |
| 0.0.5 Stable Beta | Yes |
| Earlier beta builds | No |

## Reporting a Vulnerability

Please report security issues using GitHub Private Vulnerability Reporting for this repository.

Do not open a public issue for vulnerabilities involving message data, account data, extension permissions, packaged add-on integrity, or unexpected mail actions.

If private vulnerability reporting is unavailable, open a public issue with only a brief, non-sensitive summary. Do not include reproduction details, message data, account details, screenshots, logs, or other information that could expose users. A safer follow-up path can then be coordinated through GitHub.

Please include, when safe to share privately:

- a clear description of the issue
- steps to reproduce it
- the QuietJunk version affected
- your Thunderbird version
- whether the issue involves message data, account data, extension settings, permissions, packaging, or unexpected mail behavior

## Scope

QuietJunk runs locally inside Thunderbird. It does not use a remote server, analytics service, ads, tracking scripts, or cloud sync.

Security issues most relevant to this project include:

- unintended access to message or account data
- unsafe handling of Thunderbird extension permissions
- privacy leaks
- packaged add-on integrity problems
- behavior that moves, deletes, sends, forwards, or exposes mail unexpectedly
- behavior that changes settings or account exclusions unexpectedly

## Out of Scope

The following are generally out of scope unless they create a direct privacy or data-safety issue:

- spam detection accuracy
- provider-specific spam folder quirks
- Gmail compatibility limitations
- cosmetic UI issues
- feature requests
- issues caused by modified or unofficial builds

## Response Expectations

This is a small independent project, so response times may vary. Credible reports that affect user privacy, data safety, permissions, packaging integrity, or message handling will be prioritized.

If a vulnerability is confirmed, the goal is to fix it in a future release and document the user-facing impact clearly.
