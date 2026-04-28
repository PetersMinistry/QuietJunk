# Release Checklist

Last updated: 2026-04-27

## Before Version Bump

- confirm intended feature scope for the release
- review `CHANGELOG.md`
- review `PRIVACY.md` for accuracy against current behavior
- review `ROADMAP.md` and move deferred items if needed

## Product Checks

- confirm branding hierarchy is acceptable
- confirm icons are correct
- confirm extension name, description, and version are correct in `manifest.json`
- confirm final logo is integrated if available

## Functional Checks

- load the add-on temporarily in Thunderbird
- verify settings screen loads cleanly
- verify new junk mail is marked read
- verify startup scan behavior
- verify account exclusion behavior
- verify cleanup counter and counter reset

## Stability Checks

- test with more than one account if available
- test a sync burst or restart scenario
- verify no obvious duplicate-processing churn
- verify no blocking console errors during normal use

## Packaging Checks

- confirm only intended project files are included
- confirm docs are current
- confirm version number is updated
- confirm release notes are reflected in `CHANGELOG.md`

## Final Review

- verify privacy wording still matches actual behavior
- verify no unfinished UI text remains
- verify no debug-only placeholders remain in user-facing surfaces
- create the release artifact using the chosen Thunderbird packaging flow
