# FetLife_CRM

**FetLife_CRM** (`FetLife-CRM-Tool.js`) is a local-only browser userscript for FetLife (`v1.11.5`) that turns your normal browsing into a private, searchable CRM and profile-screening workflow. It passively caches profiles you visit, filters out low-fit cards by gender, age, or Fetishes-only red kinks, highlights multi-axis compatibility signals, adds non-disruptive in-page vetting controls, and provides a full-screen CRM dashboard—without making background requests or sending data to any external server.

---

## Why Use FetLife_CRM?

Browsing Kinkster search results, group discussions, activity feeds, and member lists on FetLife normally means clicking back and forth between tabs, re-reading the same bios, and losing track of whom you have already screened or messaged. **FetLife_CRM** solves that directly inside your browser:

* **Zero external footprint:** All notes, tags, pipeline stages, and cached bios stay inside your browser's userscript storage (`GM_*`) and `localStorage`.
* **Zero background network requests:** Unlike automated crawlers or background fetch queues, this script never initiates HTTP requests on your behalf. It only reads DOM content already loaded in your active tab.
* **Zero layout displacement:** Card overlays attach cleanly at the bottom of feed/member cards (or inline at the right edge of single-line list rows) and never hide native card content, shove text downward, or compress comment/message inputs.

---

## Core Features

### 1. Profile Filtering & Card Hiding
* **Dim or Collapse Behavior:** Cards and posts matching a red-kink exclusion, falling outside your demographic filters, or marked as `Passed` are automatically dimmed (default `18%` opacity, adjustable from `5%` to `75%`) or completely collapsed (`display: none`).
* **One-Click Reveal Toggle:** Use the **`Passed Filtered` / `Showing Passed`** button on the floating HUD to temporarily reveal filtered cards and inspect why they were flagged (e.g., `-Gender (M)`, `-Age (24)`, `-No About`, or `-findom`).
* **Empty-About Filtering:** Optional toggle to dim or collapse cached profiles that have no **About** section written.

### 2. Multi-Option Gender Filtering & Manual Overrides
* **Automatic Gender Detection:** Parses headline badges (such as `34F`, `34F Sensation Switch`, `29MtF`, `40NB`) and profile header `Gender` metadata rows to classify profiles into `Female`, `Male`, or `NB / Trans / Other`.
* **Non-Destructive List Handling:** Defaults to **`♀ Female Only`**, filtering out confirmed non-matching cards while leaving untagged list cards visible until you visit their profile or classify them yourself. You can switch the global filter to **`All Genders`**, **`♀ Female Only`**, **`♂ Male Only`**, or **`⚧ NB / Trans / Other`**.
* **Persistent Manual Overrides (`Auto` / `♀ Female` / `♂ Male` / `⚧ Other`):** For profiles that omit or obscure their gender, you can manually assign a gender via:
  * The **`Gender`** dropdown on any card overlay, profile bar, or chat context strip.
  * The **`[Auto | ♀ Female | ♂ Male | ⚧ Other]`** segmented toggle inside the CRM modal.
  * The **`f`** keyboard shortcut while stepping through list cards.
  * Manual classifications immediately apply to your active gender filter and are never overwritten when you revisit a profile.

### 3. Age Window Filtering
* Enable **`Age Window`** in the HUD (default range: **`30–45`**) to automatically dim or collapse cards whose parsed age falls outside your minimum or maximum bounds.
* You can also filter by custom min/max age directly inside the CRM modal.

### 4. Highlight Categories, Fetishes-Only Red Kinks & Limit Conflict Alerts
* **Color-Coded Keyword Categories:** Ships with 6 customizable categories—**Family / Vee**, **Sensation / Play**, **Sober / Lifestyle**, **Neurotype / Style**, **Local / PDX**, and **Geek / Metal**—each with a color picker, label editor, and comma-separated keyword list.
* **Clean Badge & Multi-Match Indicators:** Each category displays at most **one badge per card** (prioritizing visible post/card text over cached bio text). Profiles matching multiple categories display a glowing cluster of colored indicator dots (`● ● ●`) and dual-accent borders.
* **Fetishes-Only Red Kinks (`Into` vs. `Limits` Separation):** When parsing `#profile-fetishes`, the script separates **Into / Curious** items from **Limits**:
  * **Red Kinks / Excludes** (such as `findom`, `tribute`, `shibari`, `impact play`, `420`) scan **only** the cached **Fetishes (`Into`)** list—ignoring `About` text, post prose, and `Limits` so someone writing about what they avoid never triggers a false exclusion.
  * **Limit Conflict Alerts:** Separately checks `Fetishes: Limits` against your positive category keywords and displays an amber **`⚠ Limit: [keyword]`** badge if someone explicitly rules out an interest you care about.

### 5. Five-Stage Vetting Pipeline & Follow-Up Tracking
* Track every profile across five color-coded stages from any card overlay, profile header, chat strip, or CRM row:
  * **`★ Shortlist`**
  * **`✉ Messaged`**
  * **`💬 Talking`**
  * **`☕ Met IRL`**
  * **`✕ Pass`**
* **Automatic Date Stamping:** Advancing someone into `Messaged`, `Talking`, or `Met IRL` automatically records a `Contacted YYYY-MM-DD` date (alongside automatic `Viewed YYYY-MM-DD` stamps when you open profiles). Any `Messaged` or `Talking` profile untouched for **5+ days** is flagged for follow-up in the CRM modal.

### 6. Toggleable Overlay View Modes (`Full` / `Compact` / `Minimal` / `Off`)
* **Overlay-Only Modes:** Cycle between **`Full Overlay + Pills`**, **`Compact Overlay (Dots)`**, **`Minimal Strip (Dots)`**, or **`Hidden Overlays`** via the HUD **`View: Full`** quick button, the **`v`** hotkey, or per-card using the **`▾` / `▸`** button (or **`m`** hotkey).
* **100% Native Content Visibility:** View modes strictly control the density of the injected `.flx-toolbar` overlay itself—native card content, posts, and avatars are never collapsed or pushed out of view.
* **Sticky Profile Bar (`📌 Pinned`):** On profile pages, injects a `/Username` control bar directly beneath FetLife's profile navigation bar and keeps it pinned at the top of the viewport as you scroll, dynamically syncing with FetLife's `#main-nav`.

### 7. Passive Profile, Fetish, Metadata & Group Parsing
* **Multi-Tab Cache Merging:** Opening `/username` caches the **About** section (`#about` / `<h2>About</h2>`), header demographics (`Relationships`, `Looking for`, location), and lazy-loaded `#profile-fetishes` and `#profile-groups-member_of` panels. Navigating to `/username/posts` (Writings) or `/username/l` (Lists) passively merges that text into the same user's cache entry.
* **Shared & Local Group Highlights:** Automatically learns your own group memberships when you view your profile and highlights shared or notable local groups (such as `🤝 PDX Zero Proof Munch`) on CRM cards and chat context strips.

### 8. Inbox & Chat Dock Context Strips + Outreach Templates
* **In-Thread Context:** Opening any conversation in `/inbox`, `/conversations`, or FetLife's floating bottom-right `#chat-dock` renders a compact CRM card above the thread showing the partner's demographics, manual gender override, pipeline stage selector, category badges, shared groups, private notes, and cached About excerpt.
* **One-Click Outreach Templates (`Template ▾`):** Customize reusable message templates in the HUD using `{username}` placeholders. Selecting a template in a chat strip automatically replaces `{username}` with your partner's handle and inserts the draft straight into FetLife's message `<textarea>` or `<lexxy-editor>` (or copies it to your clipboard if no composer is active).

### 9. Searchable Local CRM Dashboard (`Alt+C`)
* Open the isolated Shadow DOM modal from any page by clicking **`CRM`** on the HUD or pressing **`Alt+C`** (`Esc` to close).
* **Search & Multi-Faceted Filtering:**
  * Full-text search across usernames, locations, relationships, groups, private notes, cached About sections, and fetishes.
  * Filter tabs for `All`, `★ Shortlist`, `✉ Messaged`, `💬 Talking`, `☕ Met IRL`, `✎ Noted`, `Cached`, `About ✓`, `No About`, and `✕ Passed`.
  * Filter dropdowns and inputs for **Gender** (`All Genders`, `♀ Female Only`, `♂ Male Only`, `⚧ NB / Trans / Other`, `Gender Unknown`), **Relationship Status** (`Single / Available`, `Partnered / Married / Poly`, `Relationship Unknown`), **Min/Max Age**, and **Category / Red Kink / Limit Conflict**.
  * One-click toggle pills for **`🚫 Hide Red Kinks`**, **`📍 Local PDX Only`**, and **`⏰ Follow-Up Due`**.
* **Sorting & Tabbed Previews:** Sort by **Most Categories Matched**, **Pipeline Stage & Notes**, **Most Recent**, or **Username (A–Z)**, and inspect cached profiles via **`About`**, **`Fetishes & Limits`**, **`Groups`**, and **`Full Cache`** tabs.

### 10. Smart Cache Pruning & JSON / Markdown Backups
* **Tracked-Safe Pruning:** Displays live local storage usage (`KB`) in the HUD alongside **`Prune Expired`**, which purges expired cache entries (older than your configured retention TTL) for untracked profiles while permanently preserving cached bios for anyone assigned a pipeline stage, manual gender override, or private note.
* **Backup & Export:** Export and restore your entire database (settings, user records, cached bios, and self groups) as **JSON**, or click **`Export Markdown`** in the CRM modal to copy a formatted dossier of your filtered profiles.

---

## Accessing the UI & Customizing Settings

### Floating HUD Controls
* **`FL (N) ▲`:** Displays how many user cards/posts were enhanced on the current page. Click to expand or collapse the full settings drawer.
* **`CRM`:** Opens the Local CRM dashboard modal (also accessible via **`Alt+C`**).
* **`View: Full` / `Compact` / `Minimal`:** Cycles the global card overlay density (`v`).
* **`Passed Filtered` / `Showing Passed`:** Toggles whether dimmed/collapsed cards are hidden or revealed on the page.
* **`Active` / `Paused`:** Temporarily pauses DOM filtering and overlay injection.
* **`Cached: N`:** Shows total locally cached profiles (and the active handle when viewing a profile page).

### Default Behavior & Customization

| Setting | Default | Customization Options |
| :--- | :--- | :--- |
| **HUD Position** | `Bottom Right (Clear Dock)` | `Bottom Right (Clear Dock)`, `Bottom Left`, `Top Right`, `Top Left` |
| **Overlay View Mode** | `Full Overlay + Pills` | `Full Overlay + Pills`, `Compact Overlay (Dots)`, `Minimal Strip (Dots)`, `Hidden Overlays` |
| **Filter Action** | `Dim Card` (`18%` opacity) | `Dim Card` (opacity slider `5%–75%`) or `Collapse Card` |
| **Gender Filter** | `♀ Female Only` | `All Genders`, `♀ Female Only`, `♂ Male Only`, `⚧ NB / Trans / Other` |
| **Age Window** | `Disabled` (`30–45`) | Toggle on/off and set custom `Min Age` / `Max Age` (`18–99`) |
| **Pin Profile Bar** | `Enabled` (`true`) | Toggle sticky top profile bar in HUD or via **`📌 Pinned`** on any profile |
| **Inline Notes** | `Enabled` (`true`) | Show or hide private note boxes directly on Full-mode overlays |
| **Hide No-About Profiles** | `Disabled` (`false`) | Dim/collapse cached profiles that lack an **About** section |
| **Cache Retention** | `14` days | `1–90` days (tracked/noted profiles are never auto-expired) |

---

## Keyboard Shortcuts (Remappable)

List-card shortcuts let you step through visible search results, feeds, or group member lists without touching your mouse. When active, the focused card gets a gold outline and a status pill at the top of the screen.

| Action | Default Key | Behavior |
| :--- | :--- | :--- |
| **Toggle CRM Modal** | `Alt+C` | Opens or closes the CRM dashboard from anywhere on FetLife |
| **Cycle Global Overlay View** | `v` | Cycles all card overlays between `Full` → `Compact` → `Minimal` |
| **Next Card in List** | `j` | Moves focus down to the next visible card and scrolls smoothly |
| **Previous Card in List** | `k` | Moves focus up to the previous visible card |
| **Toggle Focused Overlay Minimal** | `m` | Expands or condenses the focused card's overlay between `Minimal` and `Full` |
| **Shortlist Focused Card** | `s` | Toggles `★ Shortlist` on the focused card |
| **Pass / Hide Focused Card** | `x` | Toggles `✕ Pass` on the focused card |
| **Cycle Gender Override** | `f` | Cycles `Auto` → `♀ Female` → `♂ Male` → `⚧ Other` on the focused card |
| **Edit Note on Card** | `n` | Opens the private note prompt for the focused card |
| **Open Profile in New Tab** | `o` | Opens `/username` in a background tab via `GM_openInTab` |

* **Conflict-Free Typing:** Single-key shortcuts automatically disable themselves whenever focus is inside an `<input>`, `<textarea>`, `<select>`, `<lexxy-editor>`, or Shadow DOM text field.
* **How to Remap or Disable:** Expand the HUD (`FL (N) ▲`), scroll to **Remappable Keybinds**, click any key button (`Press key…`), and press your desired key combination. Press **`Backspace`** or **`Delete`** while capturing to unbind a shortcut, uncheck **Enable list card keyboard navigation** to turn off list hotkeys completely, or click **Reset Keys** to restore defaults.

---

## Installation with Violentmonkey

1. **Install Violentmonkey:** Add the **Violentmonkey** extension from the Chrome Web Store, Firefox Add-ons (AMO), or Microsoft Edge Add-ons.
2. **Open the Script Source:** Copy the full contents of `FetLife-CRM-Tool.js` (`v1.11.5`).
3. **Create or Update the Userscript:**
   * Click the **Violentmonkey** icon in your browser toolbar and open the **Dashboard**.
   * Edit your existing script (or click **`+`** → **New**), paste the full code, and press **`Ctrl+S`**.
4. **Reload FetLife:** Open any page on `https://fetlife.com` while signed in. You will see the **`FL (N) ▲ | CRM | View: Full | Passed Filtered | Active | Cached: N`** HUD bar in the bottom-right corner.

---

## Disclaimer & Responsible Use

**FetLife_CRM** is an independent, client-side browser enhancement created for personal organization and is not affiliated with, endorsed by, or supported by FetLife. It operates strictly on pages you are authorized to view while signed into your own account and makes zero automated background requests. Use this script responsibly and in compliance with FetLife's Terms of Service and all applicable local laws.
