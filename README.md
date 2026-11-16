# FetLife_CRM

A local-only FetLife CRM and profile filtering userscript (`v1.8.0`) designed to help you screen, tag, track, and follow up with profiles without sending any data off your browser. Built for **Violentmonkey** and intended to stay entirely in-browser.

## What this tool does

* **Always-visible sticky controls & Chat Dock clearance**
  * **Sticky Profile Bar:** Pins the `Profile (/Username)` CRM bar directly below FetLife's top navigation bar (`#main-nav`) while you scroll through long **About**, **Fetishes**, and **Writings** pages.
  * **Top-Sticky Card Toolbars:** Places card/post controls at the top of each card (**`Top of Card (Sticky)`** by default, switchable to `Top of Card` or `Bottom of Card` in the HUD) so you can shift through cards without losing the action strip.
  * **Turbo-Persistent HUD & Dock Clearance:** Mounts the floating HUD onto `<html>` (`document.documentElement`) so Turbo Drive page transitions never remove or flicker the controls, and offsets the chat dock so the CRM stays clear while you message.
* **Card presentation controls & inline compact mode**
  * The HUD includes **Card Buttons** controls for **Full Labels**, **Compact Icons**, or **Hidden on Cards**, plus configurable placement so you can keep the toolbar readable or visually minimal.
  * Inline cards can be switched between a richer full presentation and a lighter compact summary for faster scanning, while still keeping the same CRM state and profile metadata visible.
* **Female-only filtering & manual gender overrides**
  * **`Female only`** is enabled by default, automatically filtering confirmed non-female gender markers while leaving untagged list cards visible until visited or classified.
  * **Manual Gender Overrides (`Auto` / `♀ Female` / `✕ Non-Female`):** Assign a gender manually to profiles that omit or obscure their gender via the toolbar dropdown on cards, profile header actions, or CRM records.
  * Optional **Age Window** filter (default `30–45`) to dim or collapse cards outside your target age range.
* **Zero-fetch passive profile & fetish caching**
  * Reads profile content already rendered in the DOM while you browse normally—making **zero background network requests**.
  * Extracts and merges **About** text, **Fetishes & Limits** (`Into` vs. `Limits`), **Writings / Lists**, age, gender, location, **Relationships**, **Looking for**, and **Groups Member Of** into a local cache for quick CRM review.
* **Split `Into` vs. `Limits` matching & conflict alerts**
  * Scans `excludeKeywords` only against positive profile sections (`header`, `About`, `Fetishes: Into`, and `Writings`) so a prospect listing a hard limit you also avoid (e.g., `no shibari`) will be highlighted before contact.
  * Separately checks `Fetishes: Limits` against your positive category keywords and surfaces an amber **`⚠ Limit: [keyword]`** badge if a profile explicitly rules out an interest on your list.
* **Five-stage vetting pipeline**
  * Tracks profiles across five color-coded stages:
    * `★ Shortlist`
    * `✉ Messaged`
    * `💬 Talking`
    * `☕ Met IRL`
    * `✕ Pass`
  * Automatically records a `Contacted YYYY-MM-DD` date when you advance someone into `Messaged`, `Talking`, or `Met IRL`, and flags profiles due for follow-up after 5+ days.
* **Category-colored keyword matching & exclusions**
  * Ships with 6 customizable color categories (*Family / Vee*, *Sensation / Play*, *Sober / Lifestyle*, *Neurotype / Style*, *Local / PDX*, and *Geek / Metal*) plus a `+ Add` / `Reset Defaults` editor in the HUD.
  * Caps badges at **one per category type** (prioritizing visible card/post text over cached bio text) and displays multi-category indicator dots (`● ● ●`) on cards and CRM rows.
* **Structured metadata & shared group highlights**
  * Parses `Relationships`, `Looking for`, and `#profile-groups-member_of` lists, highlighting shared or notable local groups (e.g., `🤝 PDX Zero Proof Munch`) on CRM cards and inside chat contexts.
* **Inbox & Chat Dock context strips with outreach templates**
  * Injects a compact CRM strip into `/inbox`, `/conversations`, and FetLife's floating bottom-right chat dock displaying demographics, manual gender override, pipeline stage selector, category badges, and note status.
  * Includes a **`Template ▾`** dropdown powered by customizable **Outreach Templates** in the HUD (with automatic `{username}` substitution) that inserts drafts directly into the message composer.
* **Remappable keyboard triage**
  * Step through visible search and member list cards with `J`/`K` (highlighted by a gold focus ring and floating status toast) and triage hands-free (`S` to Shortlist, `F` to cycle Gender, `X` to pass, `N` to note, `O` to open in a new tab).
  * Every shortcut can be remapped, unbound (`Backspace`/`Delete`), or toggled off in the HUD's **Remappable Keybinds** panel, and single-key shortcuts automatically yield whenever you are typing in a form field.
* **Searchable local CRM dashboard (`Alt+C`)**
  * Opens an isolated modal dashboard to search across usernames, locations, groups, notes, cached About sections, and fetishes.
  * Filter by pipeline stage, gender (`♀ Female Only`, `All Genders`, `Gender Unknown`, `Other / Non-Female`), relationship status (`Single / Available`, `Partnered / Married / Poly`, `Relationship Unknown`), and hide status.
  * Sort by **Most Categories Matched**, **Pipeline Stage & Notes**, **Most Recent**, or **Username (A–Z)**.
  * Includes tabbed cache previews (**About**, **Fetishes & Limits**, **Groups**, **Full Cache**), inline note editing, gender override toggles, stage switching, and single-user deletion.
* **Smart cache pruning & JSON / Markdown exports**
  * Displays live local storage usage (`KB`) in the HUD alongside **`Prune Expired`**, which deletes expired cache entries for untracked profiles while permanently preserving cached bios for anyone you have manually tagged or classified.
  * Supports full **JSON** backup/restore as well as **`Export Markdown`** in the CRM modal to copy a formatted dossier of your filtered profiles.

## Safety and privacy

* **100% local-first:** All settings, notes, pipeline stages, manual gender classifications, outreach templates, and cached profile data stay inside Violentmonkey storage (`GM_*`) and browser `localStorage`.
* **Zero background requests:** The script never transmits data to any external server and never fires automated background `fetch()` requests—it only reads pages you open yourself while logged in to FetLife.

## Installation with Violentmonkey

1. Install the **Violentmonkey** browser extension (Chrome/Chromium, Firefox, or Edge).
2. Open the Violentmonkey dashboard and click **+** (Create a new script).
3. Paste the full contents of `FetLife-CRM-Tool.js` into the editor and save (`Ctrl+S`).
4. Confirm the `@grant` permissions (`GM_getValue`, `GM_setValue`, `GM_openInTab`) and ensure the script is enabled.
5. Reload FetLife. The floating HUD pill will appear in the bottom-right corner clear of the chat dock.

## Controls & default shortcuts

### Floating HUD
* **`FL (N) ▲`:** Shows how many user cards/posts were processed on the current page; click to expand settings (HUD corner position, card button style, card toolbar placement, sticky profile bar, dim/collapse mode, age filters, and default gender handling).
* **`CRM`:** Opens the Local CRM dashboard (`Alt+C` by default; `Esc` to close).
* **`Passed Filtered` / `Showing Passed`:** Toggles visibility of dimmed/collapsed profiles.
* **`Active` / `Paused`:** Temporarily suspends page processing.
* **`Cached: N`:** Displays how many profiles are stored in your local cache.

### Default keyboard shortcuts (remappable in HUD)

| Action | Default Key | Scope |
| :--- | :--- | :--- |
| Toggle CRM Modal | `Alt+C` | Anywhere on FetLife |
| Next Card in List | `j` | Search / member / group lists |
| Previous Card in List | `k` | Search / member / group lists |
| Shortlist Focused Card | `s` | Focused card in list |
| Cycle Gender (`♀`/`✕`/`Auto`) | `f` | Focused card in list |
| Pass / Hide Focused Card | `x` | Focused card in list |
| Edit Note on Card | `n` | Focused card in list |
| Open Profile in Background Tab | `o` | Focused card in list |

### Userscript header metadata
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
