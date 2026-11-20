# FetLife_CRM

**FetLife_CRM** (`FetLife-CRM-Tool.js`) is a local-only browser userscript for FetLife (`v1.17.3`) that turns your normal browsing into a private, searchable CRM and profile-screening workflow. It passively caches profiles you visit, learns preferences from your own profile on demand, enforces clean 2-word-max deduplicated filter terms, supports portable JSON Preset Packs, protects Friends/Follows/interacted profiles from being hidden, removes filtered cards safely without triggering infinite-scroll loops, and provides a full-screen CRM dashboard—without making background requests or sending data to any external server.

---

## Why Use FetLife_CRM?

Browsing Kinkster search results, Explore feeds, group discussions, activity feeds, and member lists on FetLife normally means clicking back and forth between tabs, re-reading the same bios, and losing track of whom you have already screened or messaged. **FetLife_CRM** solves that directly inside your browser:

* **Neutral out of the box:** Ships without hardcoded orientation, gender, or personal kink biases. Any FetLife user can toggle their own gender, location, relationship, and keyword filters—or use the one-click **Learn From My Profile** tool and optional **Preset Packs**.
* **Zero external footprint:** All notes, tags, pipeline stages, custom packs, and cached bios stay inside your browser's userscript storage (`GM_*`) with automatic deduplication and `localStorage` fallback.
* **Zero background network requests:** Never initiates background HTTP requests. It only reads DOM content already loaded in your active tab.
* **Low-CPU & layout-safe:** Scopes its `MutationObserver` to `#main-content`, caches scanned card text, and uses zero-height layout-safe hiding instead of `display: none` so `<fl-masonry>` grids on Explore (`Kinky & Popular`, `Fresh & Pervy`) never collapse into infinite pagination loops.
* **Earth-tone FetLife-native styling:** Uses a muted earth-tone dark palette (ochre, slate, sage, taupe, terracotta) that blends naturally with FetLife's dark theme rather than cluttering the page with neon borders.

---

## Core Features

### 1. Layout-Safe Card Removal, Explore Loop Protection & Sub-Profile Differentiation

* **Remove or Dim Behavior:** Filtered cards (matching an Exclude term, falling outside your demographic/location filters, or marked as `Passed`) are cleanly removed from view using layout-safe zero-height styling (`Remove From View`), or optionally dimmed (`Dim Card`, adjustable `5%–75%` opacity).
* **Explore (`<fl-masonry>`) Infinite-Scroll Guard:** Because FetLife's Explore masonry tiles omit location text until visited, an optional toggle (**Keep uncached Explore tiles visible when location isn't shown**) prevents mass-hiding uncached tiles from pulling the pagination loader into an endless loop.
* **Scoped Card vs. Sub-Profile Differentiation:** In activity feed items listing secondary members inside a card (e.g., *"UserA followed: UserB, UserC"*), the parent `<article>` evaluates only its own author header while each nested `<li>` sub-profile gets its own independent inline mini-toolbar.
* **Friends, Following & CRM Visibility Protection:** Automatically keeps **Friends**, people you **Follow**, and anyone you have **Shortlisted**, **Messaged**, **Talked to**, **Met IRL**, or **Noted** visible—even if they fall outside your active demographic, location, or keyword filters. Visiting your own `/friends` or `/following` tabs passively bookmarks your social list.
* **One-Click Reveal Toggle:** Use **`Passed Filtered` / `Showing Passed**` on the floating HUD to temporarily reveal filtered cards and inspect why they were flagged.

### 2. Multi-Select Gender Filtering & Manual Overrides

* **Unbiased Multi-Select Checkboxes:** Independently toggle any combination of **♀ Cis Female**, **♂ Cis Male**, **⚧ Trans / Non-Binary / Other**, and **❓ Unspecified Gender** directly in the HUD (all enabled by default until you configure them or run the Self-Profile Learner).
* **Automatic Gender Detection:** Parses scoped headline badges (`34F`, `29MtF`, `40NB`, `38Cis Female`) and profile header `Gender` rows.
* **Persistent Manual Overrides (`Auto` / `♀ Female` / `♂ Male` / `⚧ Other`):** Override any profile's gender via the card toolbar, profile bar, chat strip, CRM modal segmented toggle, or the **`f`** hotkey.

### 3. Strict Location Filtering, Metro Expansion & Age Window

* **Structured Location Matching:** Evaluates only structured location fields (`/p/` place links and `City, State/Country` headers)—never guessing from post captions or bio prose—and explicitly disambiguates **Vancouver, WA** from **Vancouver, BC**.
* **Custom Local Regions:** Enter any comma-separated list of cities/regions in the HUD (or let **Learn From My Profile** auto-expand your metro area).
* **Live Age Window & Manual Overrides:** Toggle **`Age Window`** (`Min Age` / `Max Age`, `18–99`) for live filtering, or click any card's age pill (`34y` / `Age?`) to manually set or reset a user's age.

### 4. Commentary-Stripped Limits Extraction, 2-Word Max Filter & Duplicate Detector

* **Atomic Main-Profile Limits Parser:** Extracts Hard/Soft Limits from `About` sections while stripping parentheticals `(...)`, quoted remarks `"..."`, em-dash/semicolon explanations, and full-sentence commentary so explanatory prose never pollutes your filters.
* **2-Word Maximum Term Filter & Duplicate Detector:** Enforces a strict **≤2 words per term** rule and automatically detects/removes case- and punctuation-normalized duplicates across highlight categories, excludes, and imported packs.
* **Limit Conflict Alerts (`⚠ Limit:`):** Flags when a profile's extracted limits conflict with one of your positive highlight categories.
* **Positive-Only Exclude Scanning:** Exclude keywords scan a user's `Into` fetishes and non-limit profile text—ignoring their `Limits` section so writing *"No findom"* never triggers a false exclusion.

### 5. Built-In Lexicon & Portable Preset Pack System

* **Built-In Fetish & Lifestyle Lexicon (`KNOWN_FETISH_LEXICON`):** Provides a structured vocabulary of recognized sensory, dynamic, relationship, and lifestyle terms.
* **Optional Starter Packs:** Load optional packs on demand—such as **Sensory & Sensation Pack**, **Poly, Sober & Neurodivergent Pack**, or **Exclude Heavy BDSM & Swap Dynamics**—merging only non-duplicate, ≤2-word terms.
* **Full Pack I/O (Save, Load, Import `.json`, Export `.json`):** Save your current categories and excludes as a custom pack, export it as a standalone `.json` file to share or back up, and import external `.json` packs directly from the HUD.

### 6. Smart Self-Profile Preference Learner

* **Automatic Self Identification:** Recognizes your own account handle and ID so your own posts and cards are never filtered or cluttered with overlays.
* **One-Click Auto-Configuration (`✨ Learn From My Profile`):** Visiting your own profile page displays a dedicated status bar showing synced `Into` kinks, atomic `Limits`, and `Groups`. Clicking **Learn From My Profile** can:
* Populate a **`Shared Kink`** highlight category from your `Into` fetishes.
* Merge your clean, commentary-stripped `About` limits into `Excludes`.
* Optionally infer gender visibility from your `Orientation` + `Gender` and populate your `Local Regions` from your profile location.



### 7. Five-Stage Vetting Pipeline, Throttled Batch Tab Opener & Overlay Modes

* **Five Pipeline Stages:** Track profiles across **`★ Shortlist`**, **`✉ Messaged`**, **`💬 Talking`**, **`☕ Met IRL`**, and **`✕ Pass`**, with automatic `Viewed` / `Contacted` date stamps and **5-day follow-up** alerts.
* **Throttled Batch Tab Opener (`Open Uncached`):** Opens up to 5 visible, un-filtered, un-cached profile cards in background tabs (`2.5s` stagger) via `GM_openInTab` so you can passively cache profiles without hammering FetLife.
* **Toggleable Overlay View Modes:** Cycle between **`Full`**, **`Compact`**, **`Minimal`**, and **`Off`** globally (`v`) or per-card (`m`), plus a **`📌 Pinned`** sticky profile bar.

### 8. Inbox & Chat Dock Context Strips + Outreach Templates

* **Non-Intrusive Chat Context:** Displays a compact CRM strip above `/inbox`, `/conversations`, and `#chat_dock` threads with demographics, match dots, gender override, pipeline stage, and private notes—pausing updates whenever you are typing or scrolling.
* **Customizable Outreach Templates (`{username}`):** Create, edit, and reset reusable message templates in the HUD. Selecting a template in chat replaces `{username}` and inserts it directly into FetLife's composer (or copies to clipboard).

### 9. Searchable Local CRM Dashboard (`Alt+C`) & Storage Management

* **Full-Screen Shadow DOM CRM Modal:** Search across handles, locations, groups, notes, `About`, `Writings`, fetishes, and extracted limits. Filter by pipeline stage, **`🤝 Friends/Follows`**, gender, relationship status, age range, category, **`🚫 Hide Excludes`**, **`📍 Local Region Only`**, and **`⏰ Follow-Up Due`**.
* **Tabbed Profile Previews & Quick Controls:** Inspect cached profiles via **`About`**, **`Fetishes & Limits`**, **`Writings`**, **`Groups`**, and **`Full Cache`** tabs, with inline note editing and quick gender/stage buttons.
* **Storage Controls & File Exports:** Includes **`Purge Non-Matching Cache`**, **`Slim Storage`** (deduplicates cache and strips heavy bio prose from `Passed` profiles), **`Prune Expired`** (preserves tracked/noted/social profiles), **`Download .json` / `Load .json**` full backups, and **`Download .md`** Markdown dossier export.

---

## Floating HUD Controls & Defaults

### Quick Bar

* **`FL (N) ▲`:** Shows how many cards/posts were enhanced on the current page; click to toggle the settings drawer.
* **`CRM`:** Opens the Local CRM dashboard (`Alt+C`).
* **`Open Uncached`:** Opens up to 5 visible uncached cards in background tabs (`2.5s` stagger).
* **`Filtered: Removed` / `Dimmed`:** One-click toggle between zero-height removal and dimming.
* **`View: Full` / `Compact` / `Minimal`:** Cycles global overlay density (`v`).
* **`Passed Filtered` / `Showing Passed`:** Temporarily reveals filtered cards.
* **`Active` / `Paused`:** Pauses DOM filtering and overlay injection.

### Default Settings

| Setting | Default | Customization Options |
| --- | --- | --- |
| **Show Genders** | All `Enabled` | Multi-select checkboxes: `♀ Cis Female`, `♂ Cis Male`, `⚧ Trans / NB / Other`, `❓ Unspecified` |
| **Filtered Card Action** | `Remove From View` | `Remove From View (Layout-Safe)` or `Dim Card` (`5%–75%` opacity) |
| **Exempt Social & CRM** | `Enabled` (`true`) | Always keep Friends, Following, Shortlisted, Interacted & Noted profiles visible |
| **Local Region Filter** | `Disabled` (`false`) | Enable and set custom comma-separated regions (or auto-learn from your profile) |
| **Explore Unknown Location** | `Enabled` (`true`) | Keep uncached Explore tiles visible when no location is shown on the card |
| **Auto-Sync Self Profile** | `Enabled` (`true`) | Auto-sync your `Into` kinks & atomic `About` limits when visiting your profile |
| **Age Window** | `Disabled` (`21–65`) | Live toggle on/off and set custom `Min Age` / `Max Age` (`18–99`) |
| **HUD Position** | `Bottom Right` | `Bottom Right`, `Bottom Left`, `Top Right`, `Top Left` |
| **Overlay View Mode** | `Full Overlay + Pills` | `Full`, `Compact`, `Minimal`, `Off` |
| **Cache Retention** | `14` days | `1–90` days (tracked/social/noted profiles are never auto-expired) |

---

## Keyboard Shortcuts & Shadow DOM Input Shielding

| Action | Default Key | Behavior |
| --- | --- | --- |
| **Toggle CRM Modal** | `Alt+C` | Opens or closes the CRM dashboard from anywhere on FetLife |
| **Cycle Global Overlay View** | `v` | Cycles all card overlays between `Full` → `Compact` → `Minimal` |
| **Next Card in List** | `j` | Moves focus to the next visible card and scrolls smoothly |
| **Previous Card in List** | `k` | Moves focus to the previous visible card |
| **Toggle Focused Overlay Minimal** | `m` | Toggles the focused card's overlay between `Minimal` and `Full` |
| **Shortlist Focused Card** | `s` | Toggles `★ Shortlist` on the focused card |
| **Pass / Hide Focused Card** | `x` | Toggles `✕ Pass` on the focused card |
| **Cycle Gender Override** | `f` | Cycles `Auto` → `♀ Female` → `♂ Male` → `⚧ Other` on the focused card |
| **Edit Note on Card** | `n` | Opens the private note prompt for the focused card |
| **Open Profile in New Tab** | `o` | Opens `/username` in a background tab via `GM_openInTab` |

All shortcuts pause automatically inside text inputs, `<lexxy-editor>`, and Shadow DOM fields (`shieldShadowInputs`), and every keybind can be remapped, unbound (`Backspace`/`Delete`), disabled, or reset from the HUD.

---

## Installation with Violentmonkey

1. **Install Violentmonkey:** Add the **Violentmonkey** extension from the Chrome Web Store, Firefox Add-ons (AMO), or Microsoft Edge Add-ons.
2. **Open the Script Source:** Copy the full contents of `FetLife-CRM-Tool.js` (`v1.17.3`).
3. **Create or Update the Userscript:**
* Click the **Violentmonkey** icon in your browser toolbar and open the **Dashboard**.
* Edit your existing script (or click **`+`** → **New**), paste the full code, and press **`Ctrl+S`**.


4. **Reload FetLife:** Open any page on `[https://fetlife.com](https://fetlife.com)` while signed in. Visit your own profile page once if you want to use **Learn From My Profile**, and visit your `/friends` and `/following` tabs once to passively bookmark your social list.

---

## Disclaimer & Responsible Use

**FetLife_CRM** is an independent, client-side browser enhancement created for personal organization and is not affiliated with, endorsed by, or supported by FetLife. It operates strictly on pages you are authorized to view while signed into your own account and makes zero automated background requests. Use this script responsibly and in compliance with FetLife's Terms of Service and all applicable local laws.
