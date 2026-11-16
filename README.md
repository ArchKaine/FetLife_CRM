Yes—your draft accurately describes **v1.5.0** across every feature, storage mechanism, shortcut (`Alt+C`), and workflow.

A few small details can be tightened so the README matches the exact code behavior and reads like authoritative author documentation rather than a third-party review:

* **Zero-fetch vs. "fetch-heavy":** Since v1.0.0, all background `fetch()` calls were removed completely. Stating that the script makes **zero background network requests** (operating strictly on already-rendered DOM elements) is more accurate than saying it avoids "fetch-heavy behavior."
* **Declarative privacy wording:** Under *Safety and privacy notes*, *"The script does not appear to upload..."* sounds like an outside audit. Since it's your repository, state directly that it **never transmits or uploads** data anywhere.
* **Exact CRM sort labels:** You listed *"relevance, recency, alpha order, or stage priority."* In v1.5.0, the exact sort options are **Most Categories Matched**, **Pipeline Stage & Notes**, **Most Recent**, and **Username (A–Z)**.
* **Notable v1.5.0 behaviors worth calling out:**
* **Female-only default & unknown handling:** `Female only` is enabled by default and only filters confirmed non-female labels—cards without a visible gender tag stay visible until you visit their profile.
* **One-badge-per-category cap:** Each color category displays at most **one badge per profile/card** (favoring visible post/card text over cached bio text) to keep cards clean, while multi-category matches light up as colored indicator dots (`● ● ●`).
* **Fetishes & sub-tab merging:** Visiting a profile's `/posts` (Writings), `/l` (Lists), or `#profile-fetishes` section passively merges that data into the user's cache and splits fetishes into **Into / Curious** vs. **Limits** inside the CRM modal.


* **Formatting cleanups:** The `@match`/`@grant` metadata block is collapsed onto one line, and there is a duplicate `# FetLife_CRM` header stuck at the very bottom.

### Cleaned-Up `README.md` (Ready to Paste)

```markdown
# FetLife_CRM

A local-only FetLife CRM and profile filtering userscript designed to help you track, screen, and organize profiles without sending any data off your browser. Built for **Violentmonkey** (and other userscript managers supporting `GM_getValue` / `GM_setValue`), it enhances FetLife pages by passively caching profile text locally, adding 5-stage vetting controls, inline note-taking, chat context strips, and a searchable CRM dashboard.

## What this tool does

* **Zero-fetch passive profile caching**
  * Reads profile content already rendered in the DOM while you browse normally—making **zero background network requests**.
  * Extracts and merges **About** text, **Fetishes & Limits** (`Into` vs. `Limits`), **Writings / Lists**, age, gender, and location into local browser storage with a configurable retention TTL (default: 14 days).
* **Female-only and age window filtering**
  * Enabled by default (`Female only`), filtering out confirmed non-female gender markers while leaving untagged list cards visible until visited.
  * Optional **Age Window** filter (default `30–45`) to dim or collapse cards outside your target age range.
* **Five-stage vetting pipeline**
  * Tracks profiles across five color-coded stages:
    * `★ Shortlist`
    * `✉ Messaged`
    * `💬 Talking`
    * `☕ Met IRL`
    * `✕ Pass`
  * Automatically records a `Contacted YYYY-MM-DD` date when you move someone into `Messaged`, `Talking`, or `Met IRL`.
* **Category-colored keyword matching & exclusions**
  * Ships with 6 customizable color categories (*Family / Vee*, *Sensation / Play*, *Sober / Lifestyle*, *Neurotype / Style*, *Local / PDX*, and *Geek / Metal*) plus a `+ Add` / `Reset Defaults` editor.
  * Caps badges at **one per category type** (prioritizing visible card/post text over cached bio text) and displays multi-category indicator dots (`● ● ●`) on cards and CRM rows.
  * Flags and filters configurable exclude keywords (e.g., `findom`, `tribute`, `shibari`, `420`).
* **Dim / collapse & empty-About filtering**
  * Dims (configurable opacity) or collapses profiles marked `Passed`, matching excluded keywords, or falling outside your demographic filters.
  * Optional toggle to hide cached profiles that lack an **About** section.
  * Quick HUD toggle (`Passed Filtered` / `Showing Passed`) to reveal or re-hide filtered cards at any time.
* **Private notes & follow-up tracking**
  * Save multi-line private notes per user, displayed inline on cards (optional) and editable directly inside the CRM dashboard.
  * Tracks `Viewed` and `Contacted` dates automatically.
* **Inbox & Chat Dock context strips**
  * Injects a compact CRM strip into `/inbox`, `/conversations`, and FetLife's floating bottom-right chat dock so you can view demographics, category matches, notes, and cached About excerpts while messaging.
* **Searchable local CRM dashboard (`Alt+C`)**
  * Opens an isolated modal dashboard to search across usernames, locations, notes, cached About sections, and fetishes.
  * Filter by pipeline stage, gender (`Female Only`, `All Genders`, `Gender Unknown`, `Other / Non-Female`), min/max age, category match, note presence, or cache status.
  * Sort by **Most Categories Matched**, **Pipeline Stage & Notes**, **Most Recent**, or **Username (A–Z)**.
  * Includes tabbed cache previews (**About**, **Fetishes & Limits**, **Full Cache**), inline note saving, stage switching, and single-user deletion.
* **JSON backup and restore**
  * Exports all settings, user records, and cached profiles as JSON to your clipboard and restores them via Import.

## Safety and privacy

* **100% local-first:** All settings, notes, stage statuses, and cached profile text stay inside Violentmonkey storage (`GM_*`) and browser `localStorage`.
* **No external servers or background crawling:** The script never transmits data to any remote server and never fires automated background `fetch()` requests—it only reads pages you open yourself while logged in.

## Installation with Violentmonkey

1. Install the **Violentmonkey** browser extension (Chrome/Chromium, Firefox, or Edge).
2. Open the Violentmonkey dashboard and click **+** (Create a new script).
3. Paste the full contents of `FetLife-CRM-Tool.js` into the editor and save (`Ctrl+S`).
4. Ensure the script is enabled, then reload FetLife. The floating HUD pill will appear in the bottom-right corner.

## How to use it

### The floating HUD
* **`FL (N) ▲`:** Shows how many user cards/posts were processed on the current page; click to expand settings.
* **`CRM`:** Opens the Local CRM dashboard (shortcut: `Alt+C`, close with `Esc`).
* **`Passed Filtered` / `Showing Passed`:** Toggles visibility of dimmed/collapsed profiles.
* **`Active` / `Paused`:** Temporarily suspends page processing.
* **`Cached: N`:** Displays how many profiles are stored in your local cache.

Expanded HUD settings include HUD corner position, card toolbar mode (`Full Labels`, `Compact Icons`, `Hidden on Cards`), dim vs. collapse action, dim opacity slider, Age Window bounds, `Female only` toggle, cache retention days, empty-About hiding, color category rules, keyword exclusions, and JSON Export/Import.

### Userscript header metadata
```javascript
// @match        [https://fetlife.com/](https://fetlife.com/)*
// @match        https://*[.fetlife.com/](https://.fetlife.com/)*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle

```

## License and usage

This project is an independent browser-side enhancement for personal organization and is not affiliated with or endorsed by FetLife. Use it responsibly in accordance with FetLife's Terms of Service and your own local privacy practices.

```

Just make sure the userscript filename in your repo matches `FetLife-CRM-Tool.js` as referenced in step 3 of the installation instructions.

```
