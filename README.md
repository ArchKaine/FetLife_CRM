# FetLife_CRM

**FetLife_CRM** (`FetLife-CRM-Tool.js`) is a local-only browser userscript for FetLife (`v1.12.4`) that turns your normal browsing into a private, searchable CRM and profile-screening workflow. It passively caches profiles you visit, extracts Hard/Soft Limits directly from main profile `About` sections, auto-syncs your own profile's kinks and limits into your filter rules, differentiates main feed cards from nested sub-profile rows, filters by gender and age, isolates Shadow DOM and conversation inputs from hotkey collisions, and provides a full-screen CRM dashboard—without making background requests or sending data to any external server.

---

## Why Use FetLife_CRM?

Browsing Kinkster search results, group discussions, activity feeds, and member lists on FetLife normally means clicking back and forth between tabs, re-reading the same bios, and losing track of whom you have already screened or messaged. **FetLife_CRM** solves that directly inside your browser:

- **Zero external footprint:** All notes, tags, pipeline stages, and cached bios stay inside your browser's userscript storage (`GM_*`) and `localStorage`.
- **Zero background network requests:** Unlike automated crawlers or background fetch queues, this script never initiates HTTP requests on your behalf. It only reads DOM content already loaded in your active tab.
- **Zero layout or typing interference:** Card overlays attach cleanly at the bottom of feed/member cards (or inline at the right edge of single-line list rows), stay completely out of conversation message bubbles, pause DOM updates while you are actively typing in a composer, and shield Shadow DOM inputs so keystrokes never trigger native page shortcuts.

---

## Core Features

### 1. Profile Filtering, Card Hiding & Sub-Profile Differentiation
- **Dim or Collapse Behavior:** Cards and posts matching a red-kink exclusion, falling outside your demographic filters, or marked as `Passed` are automatically dimmed (default `18%` opacity, adjustable from `5%` to `75%`) or completely collapsed (`display: none`).
- **Scoped Card vs. Sub-Profile Differentiation:** In activity feed items that list secondary members inside a card (such as *"UserA followed: UserB (41F), UserC (37M)"* or *"UserA became friends with UserD (61M)"*), the parent `<article>` card only evaluates its own author header and never inherits ages or genders from embedded `<li>` member rows. Each nested `<li>` sub-profile gets its own independent inline mini-toolbar—so an out-of-range sub-profile only dims its own `<li>` line while leaving the parent story card visible.
- **Conversation & Inbox Protection:** Automatically skips card-toolbar injection on `/conversations/*`, `/inbox/*`, and inside `#chat_dock` so individual chat messages and reply threads remain completely clean.
- **One-Click Reveal Toggle:** Use the **`Passed Filtered` / `Showing Passed`** button on the floating HUD to temporarily reveal filtered cards and inspect why they were flagged (e.g., `-Gender (M)`, `-Age (24)`, `-No About`, or `-findom`).
- **Empty-About Filtering:** Optional toggle to dim or collapse cached profiles that have no **About** section written.

### 2. Multi-Option Gender Filtering & Manual Overrides
- **Automatic Gender Detection:** Parses scoped headline badges (such as `34F`, `34F Sensation Switch`, `29MtF`, `40NB`, `38Cis Female`) and profile header `Gender` metadata rows to classify profiles into `Female`, `Male`, or `NB / Trans / Other`.
- **Non-Destructive List Handling:** Defaults to **`♀ Female Only`**, filtering out confirmed non-matching cards while leaving untagged list cards visible until you visit their profile or classify them yourself. Switch the global filter anytime between **`All Genders`**, **`♀ Female Only`**, **`♂ Male Only`**, or **`⚧ NB / Trans / Other`**.
- **Persistent Manual Overrides (`Auto` / `♀ Female` / `♂ Male` / `⚧ Other`):** Manually assign a gender via the **`Gender`** dropdown on any card overlay, profile bar, or chat context strip, the segmented toggle inside the CRM modal, or the **`f`** hotkey. Manual overrides immediately apply to your active gender filter and are never overwritten.

### 3. Scoped Age Window Filtering & Manual Age Overrides
- **Live Age Window Filter:** Enable **`Age Window`** in the HUD (default range: **`30–45`**) to automatically dim or collapse cards whose parsed or cached age falls outside your minimum or maximum bounds. Toggling the checkbox or changing `Min Age` / `Max Age` updates cards live on the page.
- **Quick Age Override Button (`34y` / `Age?`):** Every card overlay and profile bar includes a compact age button showing the user's detected age (or `Age?` if unstated). Click it to set or override a user's age (`18–99`), or leave the prompt blank to reset to automatic detection.

### 4. Main-Profile `Limits` Extraction, Fetishes-Only Red Kinks & Conflict Alerts
Because FetLife's native `#profile-fetishes` section only lists what a user is **Into** or **Curious About**, members frequently write their limits in their **About** section. The parser preserves line breaks inside `#about` and extracts limits directly from the main profile text:
- **Main-Profile Limits Parser:** Automatically detects labeled lines (`Hard Limits:`, `Soft Limits:`, `Limits:`, `Not into:`, `Dealbreakers:`, `Hard passes:`, `Turn offs:`), bulleted/newline lists beneath a `Limits` heading, and inline prose sentences (`My hard limits include...`, `Strictly no...`).
- **Limit Conflict Alerts (`⚠ Limit:`):** Compares a user's extracted profile limits against your positive highlight categories and displays an amber **`⚠ Limit: [keyword]`** warning badge on their card, profile bar, chat strip, and CRM row if they explicitly rule out something you are looking for.
- **Fetishes-Only Red Kinks (`Into` List Only):** Red kink exclusions (such as `findom`, `tribute`, `shibari`, `impact play`, `420`) scan **only** the cached **Fetishes (`Into`)** list—ignoring `About` prose, post text, and extracted `Limits` so someone writing *"No findom"* in their bio is never falsely excluded.
- **Color-Coded Keyword Categories:** Ships with 6 customizable categories—**Family / Vee**, **Sensation / Play**, **Sober / Lifestyle**, **Neurotype / Style**, **Local / PDX**, and **Geek / Metal**—each displaying at most one badge per category alongside glowing multi-match indicator dots (`● ● ●`).

### 5. Self-Profile Detection & Automatic Kink / Limit Sync
- **Automatic Self Identification:** Recognizes your own account handle and ID via `#feed-status-form`, `window.FL.user.id`, feed actor IDs, and the `/settings/profile` (`Edit Profile`) action on your profile header, ensuring your own posts and cards are never filtered out or cluttered with CRM overlays.
- **Self-Profile Sync Bar (`👤 Your Profile`):** Visiting your own profile page displays a dedicated status bar showing how many `Into` kinks, extracted `Profile Limits`, and `Groups` are synced from your page, plus a **`↻ Sync My Kinks & Profile Limits to Filter`** button (also available inside the HUD drawer):
  - **Into / Curious Fetishes → `Shared Kink` Category:** Automatically populates a pink **`Shared Kink`** highlight category (`id: 'self_kinks'`) with your own `Into` fetishes so matching kinks light up on other people's profiles.
  - **Extracted Profile Limits → `Red Kinks / Excludes`:** Merges any hard/soft limits written in your own **About** section directly into your **Red Kinks / Excludes** list.

### 6. Five-Stage Vetting Pipeline & Follow-Up Tracking
- Track every profile across five color-coded stages from any card overlay, profile header, chat strip, or CRM row:
  - **`★ Shortlist`**
  - **`✉ Messaged`**
  - **`💬 Talking`**
  - **`☕ Met IRL`**
  - **`✕ Pass`**
- **Automatic Date Stamping:** Advancing someone into `Messaged`, `Talking`, or `Met IRL` automatically records a `Contacted YYYY-MM-DD` date (alongside automatic `Viewed YYYY-MM-DD` stamps when you open profiles). Any `Messaged` or `Talking` profile untouched for **5+ days** is flagged for follow-up in the CRM modal.

### 7. Toggleable Overlay View Modes (`Full` / `Compact` / `Minimal` / `Off`)
- **Overlay-Only Modes:** Cycle between **`Full Overlay + Pills`**, **`Compact Overlay (Dots)`**, **`Minimal Strip (Dots)`**, or **`Hidden Overlays`** via the HUD **`View: Full`** quick button, the **`v`** hotkey, or per-card using the **`▾` / `▸`** button (or **`m`** hotkey).
- **100% Native Content Visibility:** View modes strictly control the density of the injected `.flx-toolbar` overlay itself—native card content, posts, and avatars are never hidden or pushed out of view.
- **Sticky Profile Bar (`📌 Pinned`):** On other members' profile pages, injects a `/Username` control bar beneath FetLife's profile navigation bar and keeps it pinned at the top of the viewport as you scroll, syncing dynamically with `#main-nav`.

### 8. Non-Intrusive Inbox & Chat Dock Context Strips + Outreach Templates
- **In-Thread Context Without DOM Thrashing:** Opening any conversation in `/inbox`, `/conversations`, or FetLife's floating bottom-right `#chat_dock` renders a compact CRM strip above the thread showing the partner's handle, demographics, match dots, manual gender override, pipeline stage selector, and private note.
  - In `#chat_dock`, the CRM strip mounts outside `#chat_dock_thread` so incoming messages and typing indicators never tear down or reset the strip.
  - `enhanceChatContext()` automatically pauses while your cursor is focused inside a message composer so typing is never interrupted.
- **One-Click Outreach Templates (`Template ▾`):** Customize reusable message templates in the HUD using `{username}` placeholders (including preconfigured openers for local meetups, Writings pointers, and quiet café invites). Selecting a template in a chat strip replaces `{username}` with your partner's handle and inserts the draft straight into FetLife's message `<textarea>` or `<lexxy-editor>` (or copies it to your clipboard if no composer is active).

### 9. Searchable Local CRM Dashboard (`Alt+C`)
- Open the isolated Shadow DOM modal from any page by clicking **`CRM`** on the HUD or pressing **`Alt+C`** (`Esc` to close).
- **Search & Multi-Faceted Filtering:**
  - Full-text search across usernames, locations, relationships, groups, private notes, cached About sections, fetishes, and extracted profile limits.
  - Filter tabs for `All`, `★ Shortlist`, `✉ Messaged`, `💬 Talking`, `☕ Met IRL`, `✎ Noted`, `Cached`, `About ✓`, `No About`, and `✕ Passed`.
  - Filter dropdowns and inputs for **Gender** (`All Genders`, `♀ Female Only`, `♂ Male Only`, `⚧ NB / Trans / Other`, `Gender Unknown`), **Relationship Status** (`Single / Available`, `Partnered / Married / Poly`, `Relationship Unknown`), **Min/Max Age**, and **Category / Red Kink / Limit Conflict**.
  - One-click toggle pills for **`🚫 Hide Red Kinks`**, **`📍 Local PDX Only`**, and **`⏰ Follow-Up Due`**.
- **Sorting & Tabbed Previews:** Sort by **Most Categories Matched**, **Pipeline Stage & Notes**, **Most Recent**, or **Username (A–Z)**, and inspect cached profiles via **`About`**, **`Fetishes & Profile Limits (N)`**, **`Groups (N)`**, and **`Full Cache`** tabs.

### 10. Smart Cache Pruning & JSON / Markdown Backups
- **Tracked-Safe Pruning:** Displays live local storage usage (`KB`) in the HUD alongside **`Prune Expired`**, which purges expired cache entries (older than your configured retention TTL) for untracked profiles while permanently preserving cached bios for anyone assigned a pipeline stage, manual gender/age override, or private note.
- **Backup & Export:** Export and restore your entire database (settings, user records, cached bios, self groups, and synced self-profile data) as **JSON**, or click **`Export Markdown`** in the CRM modal to copy a formatted dossier (including extracted profile limits) of your filtered profiles.

---

## Accessing the UI & Customizing Settings

### Floating HUD Controls
- **`FL (N) ▲`:** Displays how many user cards/posts were enhanced on the current page. Click to expand or collapse the full settings drawer.
- **`CRM`:** Opens the Local CRM dashboard modal (also accessible via **`Alt+C`**).
- **`View: Full` / `Compact` / `Minimal`:** Cycles the global card overlay density (`v`).
- **`Passed Filtered` / `Showing Passed`:** Toggles whether dimmed/collapsed cards are hidden or revealed on the page.
- **`Active` / `Paused`:** Temporarily pauses DOM filtering and overlay injection.
- **`Cached: N`:** Shows total locally cached profiles (and the active handle when viewing a profile page).

### Default Behavior & Customization

| Setting | Default | Customization Options |
| :--- | :--- | :--- |
| **Auto-Sync Self Kinks** | `Enabled` (`true`) | Automatically syncs your own profile's `Into` kinks & `About` limits into filter rules |
| **HUD Position** | `Bottom Right (Clear Dock)` | `Bottom Right (Clear Dock)`, `Bottom Left`, `Top Right`, `Top Left` |
| **Overlay View Mode** | `Full Overlay + Pills` | `Full Overlay + Pills`, `Compact Overlay (Dots)`, `Minimal Strip (Dots)`, `Hidden Overlays` |
| **Filter Action** | `Dim Card` (`18%` opacity) | `Dim Card` (opacity slider `5%–75%`) or `Collapse Card` |
| **Gender Filter** | `♀ Female Only` | `All Genders`, `♀ Female Only`, `♂ Male Only`, `⚧ NB / Trans / Other` |
| **Age Window** | `Disabled` (`30–45`) | Live toggle on/off and set custom `Min Age` / `Max Age` (`18–99`) |
| **Pin Profile Bar** | `Enabled` (`true`) | Toggle sticky top profile bar in HUD or via **`📌 Pinned`** on any profile |
| **Inline Notes** | `Enabled` (`true`) | Show or hide private note boxes directly on Full-mode overlays |
| **Hide No-About Profiles** | `Disabled` (`false`) | Dim/collapse cached profiles that lack an **About** section |
| **Cache Retention** | `14` days | `1–90` days (tracked/noted profiles are never auto-expired) |

---

## Keyboard Shortcuts & Shadow DOM Input Shielding

List-card shortcuts let you step through visible search results, feeds, or group member lists without touching your mouse. When active, the focused card gets a gold outline and a status pill at the top of the screen.

| Action | Default Key | Behavior |
| :--- | :--- | :--- |
| **Toggle CRM Modal** | `Alt+C` | Opens or closes the CRM dashboard from anywhere on FetLife (including inside inputs) |
| **Cycle Global Overlay View** | `v` | Cycles all card overlays between `Full` → `Compact` → `Minimal` |
| **Next Card in List** | `j` | Moves focus down to the next visible card and scrolls smoothly |
| **Previous Card in List** | `k` | Moves focus up to the previous visible card |
| **Toggle Focused Overlay Minimal** | `m` | Expands or condenses the focused card's overlay between `Minimal` and `Full` |
| **Shortlist Focused Card** | `s` | Toggles `★ Shortlist` on the focused card |
| **Pass / Hide Focused Card** | `x` | Toggles `✕ Pass` on the focused card |
| **Cycle Gender Override** | `f` | Cycles `Auto` → `♀ Female` → `♂ Male` → `⚧ Other` on the focused card |
| **Edit Note on Card** | `n` | Opens the private note prompt for the focused card |
| **Open Profile in New Tab** | `o` | Opens `/username` in a background tab via `GM_openInTab` |

- **Conflict-Free Typing & Shadow DOM Shielding:**
  - Single-key script shortcuts automatically pause whenever focus is inside any `<input>`, `<textarea>`, `<select>`, `<lexxy-editor>`, or `role="textbox"` element across the main document or Shadow DOM.
  - Both `#flx-crm-host` and `#flx-hud-host` attach a Shadow DOM key-shield (`shieldShadowInputs`) that stops `keydown`, `keypress`, and `keyup` events from bubbling out of form fields onto `document`—preventing FetLife's native global hotkeys (such as `c` for Create/Comment) from intercepting or swallowing letters while you type in CRM notes or settings.
- **How to Remap or Disable:** Expand the HUD (`FL (N) ▲`), scroll to **Remappable Keybinds**, click any key button (`Press key…`), and press your desired key combination. Press **`Backspace`** or **`Delete`** while capturing to unbind a shortcut, uncheck **Enable list card keyboard navigation** to turn off list hotkeys completely, or click **Reset Keys** to restore defaults.

---

## Installation with Violentmonkey

1. **Install Violentmonkey:** Add the **Violentmonkey** extension from the Chrome Web Store, Firefox Add-ons (AMO), or Microsoft Edge Add-ons.
2. **Open the Script Source:** Copy the full contents of `FetLife-CRM-Tool.js` (`v1.12.4`).
3. **Create or Update the Userscript:**
   - Click the **Violentmonkey** icon in your browser toolbar and open the **Dashboard**.
   - Edit your existing script (or click **`+`** → **New**), paste the full code, and press **`Ctrl+S`**.
4. **Reload FetLife:** Open any page on `https://fetlife.com` while signed in. Visit your own profile page once (and scroll to your Fetishes section) so the script can automatically sync your kinks, profile limits, and groups.

---

## Disclaimer & Responsible Use

**FetLife_CRM** is an independent, client-side browser enhancement created for personal organization and is not affiliated with, endorsed by, or supported by FetLife. It operates strictly on pages you are authorized to view while signed into your own account and makes zero automated background requests. Use this script responsibly and in compliance with FetLife's Terms of Service and all applicable local laws.
