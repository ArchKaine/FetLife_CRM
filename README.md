# FetLife_CRM

A local-only FetLife CRM and profile filtering tool designed to help you track, screen, and organize profiles without sending data anywhere off your browser. The script works as a userscript for ViolentMonkey (and other userscript managers compatible with `@grant`/`GM_*` APIs) and enhances FetLife pages by caching profile text locally, adding status controls, note-taking, and a searchable CRM dashboard.

## What this tool does

This script is built around a few core workflows:

- Passive local profile caching
  - Reads profile content already on the page while you browse FetLife.
  - Stores profile text, fetish details, age, gender inference, notes, and status locally in browser storage.
  - Avoids fetch-heavy behavior by using data already present in the DOM and saving it locally for later review.

- Female-only and age filtering
  - Detects likely female profiles and optionally hides non-female matches when `Female only` is enabled.
  - Supports minimum and maximum age filtering for quick screening.
  - Uses local cache and current page metadata to evaluate matches.

- Five-stage vetting pipeline
  - Tracks profiles through a pipeline with statuses such as:
    - Shortlisted
    - Messaged
    - Talking
    - Met IRL
    - Passed
  - Each status is displayed in the profile card toolbar and chat/inbox context strip.

- Highlight-based category matching
  - Lets you define color-coded keyword categories such as values, kink, lifestyle, neurotype, local fit, or geek/metal preferences.
  - Matches are shown as pills and dots on cards and in CRM rows.
  - Can also flag excluded keywords like `findom`, `tribute`, `shibari`, etc.

- Hide / dim filter behavior
  - Can dim or collapse profiles that match filters or are marked as passed.
  - Can hide cached profiles that lack an About section.
  - Lets you decide whether to show hidden or filtered profiles in the UI.

- Notes and follow-up tracking
  - Add private notes to individual users.
  - Notes can be shown inline on cards or in the CRM dashboard.
  - Tracks last seen / last contacted dates for relationship management.

- Chat and inbox context strips
  - Adds a compact CRM strip to inbox and chat contexts so you can see the partner's tracked status while messaging.
  - Helps you keep notes and stage tracking visible without leaving the thread.

- Full local CRM dashboard
  - Opens a searchable modal dashboard with filters for:
    - gender
    - age range
    - category matches
    - note presence
    - stage status
    - caching status
  - Lets you sort by relevance, recency, alpha order, or stage priority.
  - Includes direct profile links, save-note fields, stage controls, and cached profile previews.

- Backup and restore
  - Exports all settings, user records, and local cache as JSON.
  - Imports the JSON backup later to restore your CRM state.

- Local-only data model
  - Stores data in browser local storage and ViolentMonkey `GM_*` storage when available.
  - No central server or external sync is required.

## Capabilities in practice

This script is intended to act like a personal FetLife triage layer:

- You browse normally on FetLife.
- Profiles are identified, parsed, and cached locally.
- You mark promising people as shortlisted or messaged.
- The script highlights matching interests or lifestyle signals.
- You can hide low-fit profiles or profiles without About text.
- You can keep a running CRM of people you have contacted, notes for them, and stage progression.

This makes it useful for managing a large number of profiles without needing a separate database or external service.

## Safety and privacy notes

This script is intentionally local-first.

- Data is kept in the browser's local storage or userscript storage.
- The script does not appear to upload your notes, cached biographies, or CRM state to a remote service.
- Because it works by reading DOM content on pages you already visit, it depends on you being signed in and browsing those pages normally.

Use it responsibly and only on sites and profiles you are already authorized to view.

## Installation with ViolentMonkey

1. Install the ViolentMonkey browser extension.
   - Chrome / Chromium: install from the Chrome Web Store.
   - Firefox: install from AMO or the browser extension store.
   - Edge: install from the extension store if applicable.

2. Open ViolentMonkey.

3. Create a new userscript.
   - Click the add/new script button.
   - Paste the full contents of `FetLife-CRM-Tool.js` into the editor.

4. Save the script.

5. Ensure the script is enabled.

6. Reload FetLife and browse a profile or page.

7. The HUD should appear in the corner of the page (default position: bottom-right).

## How to use it

### The floating HUD

After the script runs, a small floating HUD appears in the corner of the page.

Controls typically include:

- FL counter: how many card/profile entries were processed
- CRM button: open the local CRM dashboard
- Passed toggle: show or hide filtered profiles
- Pause toggle: temporarily stop processing
- Cache status: shows how many profiles are locally cached

The HUD also contains configuration for:

- HUD location
- card toolbar mode
- dim/collapse behavior
- age filtering
- female-only filtering
- cache retention
- highlight rules
- keyword exclusions
- private note visibility

### Profile actions

On profile cards or pages, the script adds controls for each user so you can:

- mark as Shortlist
- set pipeline stage
- pass / hide the profile
- add a note
- see demographic metadata
- see match categories in colored badges

### CRM dashboard

Press Alt+C or click the CRM button in the HUD to open the dashboard.

From there you can:

- search by username, note, location, keywords, or cached bio text
- filter by gender and age range
- filter by pipeline stage and category match
- sort by recency, matches, alpha, or stage priority
- edit notes inline
- change stage directly from the dashboard
- delete users from local tracking
- export/import the full JSON backup

### Local profile cache

The script caches profile information it already sees, including:

- About text
- fetish/limit data
- header text
- age and gender inference
- location hints
- profile text summaries

This allows faster review later and supports CRM filtering without needing to re-fetch the same profile information repeatedly.

## Included script metadata

The userscript includes the following match rules:

```js
// @match        https://fetlife.com/*
// @match        https://*.fetlife.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
```

This means it is designed to run on FetLife pages as soon as the document is idle.

## Quick start example

1. Install the script in ViolentMonkey.
2. Open FetLife and browse a profile.
3. Confirm the HUD appears.
4. Set a few highlight categories you care about.
5. Enable `Female only` if desired.
6. Mark promising profiles as `Shortlist` or `Messaged`.
7. Open CRM with Alt+C to review your tracked profiles.
8. Export the JSON backup whenever you want a local copy of your tracked data.

## Notes about repository status

This repository presently contains a single userscript file, `FetLife-CRM-Tool.js`, plus this README. The script is functional in userscript environments and is intended to be used on FetLife while you browse.

## License and usage

This project is not an official FetLife product or service. It is a browser-side enhancement for personal use. Please use it in line with the platform's terms of service and your own local privacy / safety practices.

If you want to make changes, fork the repo and edit the userscript as needed. For users specifically using ViolentMonkey, the script should be pasted directly as a userscript and enabled in the browser.

```markdown
# FetLife_CRM
A filtering tool for FetLife
```
