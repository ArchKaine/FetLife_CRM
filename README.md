# FetLife_CRM

A local-only FetLife CRM and profile filtering userscript (`v1.9.1`) designed to help you screen, tag, track, and follow up with profiles while browsing. It runs in Violentmonkey and keeps its settings, notes, and profile cache in your browser.

## What this tool does

* **Sticky profile controls & Chat Dock clearance**
  * **Sticky Profile Bar:** Pins the profile CRM bar beneath FetLife's top navigation while you scroll through long profile sections. Use the pin button on the bar or the HUD setting to enable or disable it.
  * **Card Toolbar Placement:** Places card controls at the top of cards (sticky by default), at the top without sticking, or at the bottom. Configure placement in the HUD.
  * **Turbo-Persistent HUD:** Mounts the floating HUD on the document root so it survives FetLife Turbo page transitions. Its default bottom-right placement is offset to avoid the chat-dock launcher.
* **Toggleable Full, Compact, and Minimal card views**
  * Use the HUD's **View: Full** button or press `v` to cycle the global card view through **Full**, **Compact**, and **Minimal**. The HUD setting also offers **Off** to hide card toolbars.
  * Each tracked card has an inline expand/minimize control. Click it or focus the card and press `m` to switch that card between **Minimal** and **Full**, without changing the global setting. These per-card overrides last for the current page session; they are not saved to the CRM database.
  * **Full** shows the detailed card toolbar, metadata pills, and configured inline notes. **Compact** keeps the original FetLife card visible with compact CRM controls and match dots. **Minimal** hides the card's native content and shows a slim CRM strip with a profile link, compact controls, and colored match dots. Match dots remain available in all three views; **Off** hides the toolbar.
* **Female-only filtering & manual gender overrides**
  * **Female only** is enabled by default. Confirmed non-female profiles can be dimmed or collapsed; profiles with unknown gender are not automatically rejected.
  * **Manual Gender Overrides (`Auto` / `♀ Female` / `✕ Non-Female`):** Set a gender manually from card controls, the profile bar, or CRM records.
  * Optional **Age Window** filtering uses adjustable minimum and maximum ages (defaults are 30 and 45; filtering is off by default).
* **Passive profile caching**
  * Reads profile information already rendered in the page while you browse; it does not make background fetch requests.
  * Caches available About, Fetishes and Limits, Writings or Lists, age, gender, location, relationship, looking-for, and group information for local search and review.
  * Cache retention is configurable. Expired entries can be pruned; profiles with a stage, manual gender classification, or non-empty note are retained by pruning.
* **Into / Limits matching and conflict alerts**
  * Searches positive profile text and cached text for your custom exclude keywords and highlight categories.
  * Parses fetish entries into **Into / Curious** and **Limits** where the page structure allows it. A keyword matching a saved category and a profile's Limits is called out with an amber limit-conflict badge.
* **Five-stage vetting pipeline**
  * Track profiles as `★ Shortlist`, `✉ Messaged`, `💬 Talking`, `☕ Met IRL`, or `✕ Pass`.
  * Moving a profile into Messaged, Talking, or Met IRL automatically records a contact date unless one is already supplied.
  * Inline controls let you change a stage, pass or restore a profile, and add a private note.
* **Color-coded keyword categories and excludes**
  * Includes six editable default highlight categories: *Family / Vee*, *Sensation / Play*, *Sober / Lifestyle*, *Neurotype / Style*, *Local / PDX*, and *Geek / Metal*.
  * Add or remove categories, change their colors and keywords, and edit comma-separated exclude keywords in the HUD. Reset Defaults restores the built-in rules and excludes.
  * Matching indicators and badges help show which categories or excluded terms matched visible or cached profile text.
* **Inbox and Chat Dock context strips with outreach templates**
  * Adds a CRM context strip to FetLife's inbox, conversations, and floating chat dock when a conversation partner can be identified. It can show cached match information, profile details, stage, notes, and relevant groups.
  * Choose an outreach template from the strip to insert its text into the visible message composer. Templates support `{username}` substitution and can be edited in the HUD.
* **Remappable keyboard triage**
  * Navigate visible cards with `j` and `k`, then shortlist (`s`), toggle the focused card's minimal view (`m`), cycle its gender override (`f`), pass or restore it (`x`), edit its note (`n`), or open its profile in a background tab (`o`).
  * Press `v` to cycle the global card view. Shortcuts can be remapped or unbound in the HUD. Single-key actions are suppressed while typing in editable fields.
* **Searchable local CRM dashboard (`Alt+C`)**
  * Search tracked profiles and cached text, and filter by stage, gender, relationship status, age, category, excluded terms, local PDX matches, and follow-up due status.
  * Sort by matched categories, pipeline priority and notes, recency, or username.
  * Review cached About, Fetishes and Limits, Groups, and full-cache text; edit notes, set gender overrides and stages, or delete a profile and its cache.
  * Export filtered profiles as a Markdown dossier or export and restore the local database as JSON. Press `Esc` to close the modal.

## Safety and privacy

* **Local-first:** Settings, notes, pipeline stages, gender overrides, templates, and cached profile data are stored in Violentmonkey storage and browser `localStorage`.
* **No background fetching:** The script reads content already displayed in pages you visit and does not send profile data to an external server.

## Installation with Violentmonkey

1. Install the **Violentmonkey** browser extension.
2. Open the Violentmonkey dashboard and create a new userscript.
3. Paste the contents of `FetLife-CRM-Tool.js` into the editor and save it.
4. Ensure the script is enabled and allow its declared userscript grants: `GM_getValue`, `GM_setValue`, and `GM_openInTab`.
5. Reload FetLife. The floating HUD should appear on FetLife pages.

## Controls & default shortcuts

### Floating HUD

* **`FL (N) ▲`:** Expands or collapses the settings panel; `N` is the number of cards processed on the current page.
* **`CRM`:** Opens the Local CRM dashboard.
* **`View: Full` (or current view):** Cycles the global card view among Full, Compact, and Minimal. The HUD setting also provides Off.
* **`Passed Filtered` / `Showing Passed`:** Toggles visibility of passed profiles.
* **`Active` / `Paused`:** Starts or pauses page processing.
* **`Cached: N`:** Shows the number of profiles in the local cache.

### Default keyboard shortcuts (remappable in HUD)

| Action | Default Key | Scope |
| :--- | :--- | :--- |
| Toggle CRM Modal | `Alt+C` | Anywhere on FetLife |
| Cycle Global Card View | `v` | Anywhere outside editable fields / CRM modal |
| Next Card in List | `j` | Visible tracked cards |
| Previous Card in List | `k` | Visible tracked cards |
| Toggle Focused Card Minimal / Full | `m` | Focused tracked card |
| Shortlist Focused Card | `s` | Focused tracked card |
| Cycle Gender (`♀` / `✕` / `Auto`) | `f` | Focused tracked card |
| Pass / Restore Focused Card | `x` | Focused tracked card |
| Edit Note on Card | `n` | Focused tracked card |
| Open Profile in Background Tab | `o` | Focused tracked card |

## Userscript header metadata

The main script declares the following Violentmonkey metadata:

```javascript
// @match        https://fetlife.com/*
// @match        https://*.fetlife.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @run-at       document-idle
```

## License and usage

This project is an independent browser-side enhancement for personal organization and is not affiliated with or endorsed by FetLife. Use it responsibly in accordance with FetLife's Terms of Service and local laws.
