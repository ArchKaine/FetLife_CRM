# FetLife_CRM

**FetLife_CRM** (`FetLife-CRM-Tool.js`) is a local-only browser userscript for FetLife (`v1.18.4`) that turns normal browsing into a private, searchable CRM and profile-screening workflow. It passively caches profiles you visit, learns preferences from your own profile on demand, supports clean deduplicated filter terms, provides portable JSON preset packs, protects friends/follows/interacted profiles from being hidden, safely removes filtered cards without disrupting FetLife's infinite-scroll grids, and provides a full-screen CRM dashboard—without sending data to an external server or making background HTTP requests.

---

## Why Use FetLife_CRM?

Browsing search results, Explore feeds, group discussions, activity feeds, and member lists on FetLife normally means repeatedly opening profiles and re-reading the same information. FetLife_CRM keeps useful profile context, your private notes, vetting stages, and custom filters together as you browse.

* **Neutral out of the box:** Ships without hardcoded gender, orientation, location, or personal kink preferences. Personalize it through the HUD or the self-profile learner.
* **Zero external footprint:** Notes, pipeline stages, custom packs, and cached profiles stay in your browser. The script uses Violentmonkey storage (`GM_*`) when available, with `localStorage` as a fallback.
* **Zero background network requests:** The script only reads DOM content already loaded in the active tab. It never initiates profile API requests; tab opening is opt-in.
* **Low-CPU and layout-safe:** Its `MutationObserver` is scoped to `#main-content`, and filtered cards are hidden with a zero-height layout-safe removal or dimming instead of normal layout collapse that can interfere with `<fl-masonry>` Explore grids.
* **Earth-tone FetLife-native styling:** Uses a subdued dark, ochre, slate, sage, taupe, and terracotta palette.

---

## Core Features

### 1. Layout-Safe Filtering

* **Remove or Dim:** Filtered cards matching an Exclude term or demographic/location/relationship/age rule can be removed with zero height or dimmed at a configurable opacity.
* **Explore protection:** FetLife Explore masonry tiles with unknown locations can remain visible, preventing a location filter from triggering infinite-scroll loops.
* **Post and sub-profile awareness:** Activity feed cards are evaluated without including unrelated secondary users or editor/comment text.
* **Social and CRM protection:** Optional exemptions keep Friends, people you Follow, and profiles you have shortlisted, contacted, met, passed, or noted visible.
* **Passed profile reveal:** The HUD can temporarily reveal Passed profiles for inspection.

### 2. Gender, Age, Location, and Relationship Controls

* Independently enable Cis Female, Cis Male, Trans/Non-Binary/Other, and Unspecified gender categories.
* Detect age and gender from profile badges and explicit profile rows, with persistent manual overrides.
* Set manual ages or clear them to return to automatic detection.
* Filter by an age window (`18–99`).
* Match structured location fields only—never guessed location text from posts or bios.
* Configure comma-separated local regions or infer a metro area from your own profile.
* Filter relationships by all, single/available, or partnered/married/poly status.

### 3. Atomic Limits and Exclude Scanning

* Extract hard and soft limits from About sections and profile language.
* Strip parentheticals, quotations, em-dash commentary, semicolon explanations, and full-sentence prose where extracting compact terms.
* Classify limits as hard, soft, or unspecified where enough context is available.
* Accept filter terms of **1–5 words**, up to 48 characters, while rejecting sentence fragments.
* Detect case-, punctuation-, and whitespace-normalized duplicates across highlight categories and excludes.
* Warn when a profile's hard or soft limits conflict with one of your highlight categories.
* Exclude matching ignores profile limit sections, so text such as “No findom” does not accidentally trigger an Exclude from another section.

### 4. Lexicon and Portable Preset Packs

* **Built-in lexicon:** Recognizes sensory, impact/restraint, relationship/lifestyle, and common hard-limit terms.
* **Starter packs:** Sensory & Sensation, Poly/Sober/Neurodivergent, and Exclude Heavy BDSM & Swap Dynamics.
* **Custom packs:** Save the current categories and excludes, export them as JSON, or import and merge another pack.
* Imported or loaded terms are sanitized and deduplicated before use.

### 5. Self-Profile Preference Learner

* Detect your own account and remember it locally.
* Visit your own profile to sync `Into` fetishes, groups, and classified `About` limits.
* Optionally add your `Into` fetishes as a **Shared Kink** highlight rule.
* Add hard limits to Excludes and soft limits to a warning category.
* **Auto-Configure** can infer gender preferences from your Orientation and local regions from your profile Location.

### 6. Pipeline, Card Controls, and Overlay Modes

* Track profiles in `Shortlisted`, `Messaged`, `Talking`, `Met IRL`, or `Passed` stages.
* Record Viewed and Contacted dates, private notes, manual gender, and manual age.
* Cycle all overlays through **Full**, **Compact**, **Minimal**, or **Off**, or override a single card.
* Pin a persistent profile bar with stage and filtering controls to a profile page.
* Open up to five visible, matching, uncached profiles in throttled background tabs (`2.5` seconds apart).

### 7. Inbox and Chat Context

* Show a compact CRM strip in `/inbox`, `/conversations`, and `#chat_dock` threads.
* Display demographics, match dots, limit conflicts, shared groups, pipeline stage, gender override, and private notes.
* Use customizable `{username}` outreach templates and insert them into supported FetLife composers or copy them to the clipboard.
* Updates pause while scrolling or typing in chat editors.

### 8. Local CRM Dashboard

Open with `Alt+C` or the HUD's **CRM** button.

* Search handles, locations, groups, notes, About text, writings, fetishes, and limits.
* Filter by pipeline stage, gender, relationship, age, category, excludes, limit conflicts, Friends/Follows, cache status, or follow-up status.
* Sort by matches, pipeline priority, recency, or username.
* Inspect profile About, Fetishes & Limits, Writings, Groups, and Full Cache tabs.
* Edit private notes and update pipeline/gender controls inline.
* Follow up due reminders appear for Messaged or Talking profiles after five days.
* Export filtered results as Markdown dossiers or back up all CRM data as JSON.

### 9. Storage and Maintenance

* **Purge Non-Matching Cache** removes unnoted profiles that no longer match display settings.
* **Slim Storage** deduplicates cache entries and strips heavy prose from Passed profiles.
* **Prune Expired** removes expired cache entries while preserving tracked, social, and noted profiles.
* **Clear Cache** removes cached profile bios.
* **Download/Load `.json`** imports and exports the settings, users, cache, and self-profile data.
* **Download `.md`** creates a Markdown dossier from the dashboard's active filtered results.

---

## Floating HUD Controls

### Quick Bar

* **`FL (N) ▲`** — Number of enhanced cards/posts; click to open or close the settings drawer.
* **`CRM`** — Open the Local CRM dashboard (`Alt+C`).
* **`Open Uncached`** — Open up to five matching uncached profiles in background tabs.
* **`Filtered: Removed / Dimmed`** — Switch filtered-card behavior.
* **`View: Full / Compact / Minimal / Off`** — Change overlay density globally.
* **`Passed Filtered / Showing Passed`** — Reveal or hide Passed profiles.
* **`Active / Paused`** — Pause or resume filtering and overlays.

### Default Settings

| Setting | Default | Customization |
| --- | --- | --- |
| Show Genders | All enabled | Female, Male, Trans/NB/Other, and Unknown independently |
| Filtered Card Action | Remove from view | Layout-safe removal or dimming (`5%–75%`) |
| Exempt Social & CRM | Enabled | Keep Friends, Following, Shortlisted, Interacted, and Noted profiles visible |
| Local Region Filter | Disabled | Comma-separated regions or profile-based learning |
| Explore Unknown Location | Enabled | Keep uncached Explore tiles visible |
| Relationship Filter | All | All, Single/Available, or Partnered |
| Auto-Sync Self Profile | Enabled | Sync kinks and limits while visiting your profile |
| Age Window | Disabled (`21–65`) | Live toggle and custom `18–99` range |
| HUD Position | Bottom Right | Bottom Right, Bottom Left, Top Right, or Top Left |
| Overlay View Mode | Full | Full, Compact, Minimal, or Off |
| Cache Retention | 14 days | `1–90` days; tracked/social/noted profiles are protected |
| Chat Context | Enabled | Show or hide the Inbox/Chat Dock CRM strip |
| Profile Bar | Pinned | Pin or unpin the profile bar while scrolling |

---

## Keyboard Shortcuts

Defaults are remappable or may be disabled/unbound in the HUD.

| Action | Default | Behavior |
| --- | --- | --- |
| Toggle CRM Modal | `Alt+C` | Open or close the dashboard |
| Cycle Global Overlay View | `v` | Full → Compact → Minimal → Off |
| Next Visible Card | `j` | Focus and scroll to the next card |
| Previous Visible Card | `k` | Focus and scroll to the previous card |
| Toggle Focused Overlay | `m` | Switch the focused card between Minimal and Full |
| Shortlist Focused Card | `s` | Toggle Shortlist status |
| Pass Focused Card | `x` | Toggle Passed status |
| Cycle Gender Override | `f` | Auto → Female → Male → Other |
| Edit Note | `n` | Prompt for a private note |
| Open Profile | `o` | Open the focused profile in a background tab |

Shortcuts pause inside inputs, `<lexxy-editor>` elements, and Shadow DOM fields. Text-editor input is protected from global navigation keybinds.

---

## Installation with Violentmonkey

1. Install [Violentmonkey](https://violentmonkey.github.io/) in Chrome, Firefox, Edge, or another supported browser.
2. Open `FetLife-CRM-Tool.js` and copy the full userscript source.
3. Open the Violentmonkey Dashboard, choose **Create a new script**, paste the source, and save.
4. Open FetLife while signed in and refresh.
5. Visit your own profile once to enable profile-based learning.
6. Visit `/friends` and `/following` once if you want existing social relationships detected passively.

The script requires `GM_getValue`, `GM_setValue`, and `GM_openInTab`; it is intended for userscript managers such as Violentmonkey.

---

## Privacy and Responsible Use

FetLife_CRM is an independent, client-side browser enhancement. It is not affiliated with, endorsed by, or supported by FetLife.

All CRM records and caches are stored locally in the browser/userscript manager. The script does not transmit records to an external server. It reads only FetLife pages and DOM content you are authorized to view while signed into your account.

Use it responsibly and in compliance with FetLife's Terms of Service and applicable local laws.
