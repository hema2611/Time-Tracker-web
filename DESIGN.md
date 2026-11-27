# ImagiNET Time Tracker – Design System

> **Instructions for Claude Code (read first)**
> - Every UI change MUST follow this file. It overrides the look of existing screens.
> - You may rewrite or replace existing components. Do not copy the current look to stay "consistent".
> - Aim for a premium, calm, business-class result. Never ship a stock look: grey cards, default Tailwind palette, flat boxes, a plain blue/purple button.
> - Colours come only from the theme tokens in `src/theme.css` (Tailwind names below). No hex codes, no `bg-gray-*`, `bg-purple-*`, `bg-indigo-*` in pages.
> - Every screen must work in light and dark.
> - If a prototype exists in `/design/*.html` for the screen, match it first, then convert to React + Tailwind.
> - Before finishing: both themes, contrast, hover/focus states, empty/loading/error states.

Stack: React + Vite, React Router, Tailwind, lucide-react. API: Express + MySQL. Agent: Electron (plain HTML windows).

Prototypes in `/design`:
- `tracker-light-prototype.html` – web sign-in + Attendance (light and dark)
- `agent-window-prototype.html` – agent sign-in + main window
- `agent-floating-widget.html` – agent floating widget (dot / pill / expanded)
- `palette-from-logo.html` – the logo palette, brand scale, tokens and contrast checks

---

## 0. Logos (rule from the user, 27 Nov)

- **Single icon** (favicon, agent app/taskbar/tray icon, installer, browser-extension icon, collapsed sidebar, popups, anywhere one square mark is needed): the **W mark**, the three overlapping violet triangles. Files: web `public/brand/imaginet-mark.png`; agent `assets/mark.png` (+ `icon.png` 512, `icon.ico` 16/32/48/256, `tray.png`, `tray-away.png` faded grey); extension `icon16/48/128.png`. In React use `<Mark />`.
- **Full logo with the name** (sign-in, sidebar header, agent main window and question screens): the **ImagiNET Ventures wordmark** — web `public/brand/imaginet-logo-clear.png` (`<Brand />`), agent `assets/logo.png`.
- Never draw the mark by hand (no inline SVG triangles) and never use the old round orb (`imaginet-orb.png`).

## 1. Personality

Quiet, precise, trustworthy. Thin geometric type, hairline borders, one violet accent used like a light source. A tool people keep open all day, so calm beats flashy.

- One accent: **violet**. Never navy or blue-dominant surfaces.
- Hierarchy comes from size, weight and spacing, not boxes and colour.
- Fewer elements, each one well made. Overview first, detail on demand.
- Status colours are semantic and separate from brand violet.

---

## 2. Tokens (`src/theme.css`)

Colours are sampled from the ImagiNET logo: one purple hue family (about 265-275°), from near-black violet to pale orchid. Backgrounds are pure **black** (dark) and pure **white** (light). Keep the existing names that already exist (`surface`, `fg`, `violet`, `ok`) and add the missing ones. Each token has a dark and a light value; switching `data-theme` changes every page with no edits to pages.

| Token | Dark | Light | Use |
|---|---|---|---|
| `bg` | `#000000` | `#FFFFFF` | page background |
| `surface` | `#0D0A12` | `#FFFFFF` | cards, sidebar, drawer |
| `surface-2` | `#181220` | `#F7F3FB` | chips, tracks, recessed areas |
| `line` | `rgba(185,143,215,.16)` | `rgba(68,34,104,.12)` | 1px borders and dividers |
| `fg` | `#F5F0FA` | `#1A0833` | primary text |
| `fg-2` | `#B8AFC7` | `#55486B` | secondary text |
| `fg-3` | `#8F869E` | `#7A6E8F` | muted text (lightest allowed) |
| `violet` | `#A077C6` | `#7B519D` | actions, selection, focus |
| `violet-strong` | `#D1ADE9` | `#442268` | text on violet tint, wordmark |
| `violet-tint` | `rgba(160,119,198,.16)` | `#F4EDFA` | active nav, selected rows |
| `ok` | `#34D399` | `#059669` | working, at desk, present, approved |
| `away` | `#60A5FA` | `#2F7DE1` | away work, meeting |
| `idle` | `#FBBF24` | `#D99A0B` | idle, pending, needs review |
| `brk` | `#FB923C` | `#EA7A1C` | break |
| `off` | `#FB7185` | `#E5546B` | offline, rejected, error |

### Brand scale (from the logo)

`950 #1A0833` · `900 #2A0E4C` · `800 #442268` · `700 #58317E` · `600 #68428C` · `500 #7B519D` · `400 #8C5FB1` · `300 #A077C6` · `200 #B98FD7` · `100 #D1ADE9` · `50 #F4EDFA`

Use only these steps for anything purple. Dark steps carry text and pressed states, mid steps carry actions, light steps carry tints and highlights. Do not introduce other purples, blues or indigos.

### Gradients (CSS variables)

- `--grad-brand`: light `linear-gradient(100deg,#58317E,#8C5FB1)`; dark `linear-gradient(100deg,#68428C,#8C5FB1)`. Primary buttons, progress ring, bars. White text on it passes AA.
- `--grad-panel`: light `linear-gradient(155deg,#2A0E4C,#58317E 55%,#8C5FB1)`; dark `linear-gradient(155deg,#1A0833,#442268 55%,#68428C)`. Sign-in panel only.

### Shadows and radii

- `shadow-card`: light `0 1px 2px rgba(68,34,104,.06), 0 8px 24px rgba(68,34,104,.08)`; dark `0 1px 2px rgba(0,0,0,.6), 0 8px 24px rgba(0,0,0,.5)`.
- `rounded-md` 11px (inputs, buttons), `rounded-lg` 16px (cards), `rounded-xl` 22px (modals). Add these to the Tailwind theme.

### Surfaces on pure white and pure black

Cards separate from the page by their 1px `line` border and `shadow-card`, not by a different fill. Recessed areas (tracks, chips, inputs at rest) use `surface-2`.

Use the same mechanism the project already uses to expose tokens to Tailwind (CSS variables mapped in the Tailwind config or `@theme`). Opacity utilities like `bg-violet/20` must keep working.

---

## 3. Typography

| Use | Class | Rule |
|---|---|---|
| Titles, hero numbers | `font-display font-light` (Outfit 300; 200 for hero numerals) | never bold |
| UI text | `font-sans` (Inter 400/500/600) | body 14px, small 12px |
| Times, durations, IDs | `font-mono tabular-nums font-light` (JetBrains Mono) | always tabular |
| Micro-labels | `text-[11px] uppercase tracking-[.18em] text-fg-3 font-medium` | section and KPI captions |

Scale: 11 / 12 / 14 / 16 / 20 / 26 / 32 / 52. Page title 32. Auth headline 52. Use typographic apostrophes and quotes in visible copy.

---

## 4. Layout and surfaces

- Shell: 230px sidebar, content `max-w-[1180px]`, padding `px-8 py-7`.
- Card: `bg-surface border border-line rounded-lg shadow-card`. No heavy shadows, thick borders, or gradients on cards.
- 4px spacing grid. Dividers are `border-line` hairlines.
- Three surface levels only: `bg` (page), `surface` (card), `surface-2` (recessed).
- Sidebar active item: `bg-violet-tint text-violet-strong` with a 3px `bg-violet` bar on the left edge. Never a solid violet block.

---

## 5. Components (`src/components/ui/`)

Build these once and compose pages from them. Pages never style raw `<button>` or `<input>`.

`Button`, `Input`, `Card`, `Chip`, `StatusDot`, `Avatar`, `KpiCard`, `Drawer`, `Timeline`, `ProgressRing`, `Skeleton`, `EmptyState`, `ThemeToggle`.

- **Button primary:** gradient, white text, weight 500, `rounded-md`, soft violet shadow; hover lifts 1px; active scale .985; disabled 50%.
- **Button secondary:** transparent, `border border-line`, hover `bg-violet-tint`.
- **Input:** `bg-surface border border-line rounded-md px-3.5 py-3`; focus `border-violet ring-4 ring-violet/20`; error `border-off` with 12px message. Password has Show/Hide.
- **Chip:** neutral (`bg-surface-2 text-fg-2`). Tint only when action is needed (`idle`).
- **StatusDot:** 8px. "Working" breathes (2.5s pulse). Idle, paused and offline are static.
- **List/table:** no zebra, no outer grid. Row dividers, hover `bg-surface-2`, avatar initials on `violet-tint`, 5px progress bars.
- **Drawer:** detail views open in a right-side drawer (max 640px, dim backdrop, 300ms slide). No inline expansion in lists.
- **KpiCard:** micro-label, 30px Outfit light number, optional status dot.
- **Timeline:** 38px bar, segments by status colour, tooltip, "Last seen" marker, axis fitted to working hours.
- **Empty:** icon, one sentence, one action. **Loading:** skeletons, not spinners.
- Icons: `lucide-react`, 16 or 18px, stroke 1.5.
- **Dropdowns of master data** (projects, employees, roles) show **+ Add new …** pinned at the bottom of the list (`onAddNew` / `addLabel` on `Dropdown` and `MultiSelect`, wired through `useQuickAdd()` in `components/QuickAdd.jsx`). It opens the real master form on top and selects the new record. Shown only to people allowed to create that master. Every new master-data dropdown must do the same.

---

## 6. Status semantics (same meaning everywhere)

| Status | Token |
|---|---|
| Working, At desk, Present, Approved | `ok` |
| Away work, Meeting | `away` |
| Idle, Pending, Needs review | `idle` |
| Break | `brk` |
| Offline, Rejected, Error | `off` |
| Not started, No agent | `fg-3` |

Violet is for actions, selection and focus only, never for a status.

---

## 7. Motion

- 150-250ms ease-out for hover, focus, toggles; 300ms for drawers and route changes.
- Route content fades up 6px. Timers and KPIs tick or count up; they never jump.
- Honour `prefers-reduced-motion` (disable animation and transitions).

---

## 8. Page patterns

**Sign-in (`/login`):** split screen. Left: `--grad-panel` purple panel, logo, headline "Work, recorded.", one line of subtext, wide-tracked tagline at the bottom, faint translucent triangles. Right: "Welcome back", email, password (Show/Hide), "Forgot password?", gradient button. Nothing else: no charts, feature lists or stats.

**Attendance (`/attendance`):** title + `‹ Today ›` date control, KPI row (Present, Away, Not started, Offline, Avg hours), "Team now" list, a person's day in a Drawer (ring, time range, one legend, timeline, away-from-desk list, devices collapsed to "3 devices · 2 outdated · Details").

**Other modules (Leaves, EOD, Projects, Tasks, Change requests):** same pattern: title + filters, KPI row if useful, list, detail in a Drawer. Do not invent new layouts.

---

## 9. Web app rules

- Theme: sun/moon `ThemeToggle` sets `data-theme` on `<html>`, saves to `localStorage`, first visit follows `prefers-color-scheme`. Apply it before first paint (inline script in `index.html`) to avoid a flash.
- Fonts: Outfit, Inter, JetBrains Mono from Google Fonts with real fallbacks.
- Auth uses the existing secure cookie. Show friendly inline errors (401 → "Email or password is incorrect").
- Accessibility: visible focus ring on every interactive element, AA contrast in both themes, labels on inputs, `aria-live` on status changes.
- Responsive: sidebar collapses under 860px, KPIs go to 2 columns, tables become stacked cards.

---

## 10. Desktop agent (Electron)

The agent windows are plain HTML, so they must not drift from the web app.

- **One source of colours:** generate `agent/src/tokens.css` from `Time-Tracker-web/src/theme.css` (copy or a small build script) and `<link>` it in every agent window. Do not retype colours by hand.
- Bundle Outfit, Inter and JetBrains Mono locally (agent must work offline).
- Windows: frameless, custom title bar in `bg`, `rounded-xl`, hairline `line` border, faint violet glow at the top edge, Mica/acrylic where supported.
- Main window: hero timer (Outfit/mono light) inside a thin gradient ring, status pill with breathing dot, day timeline strip, top apps, "Synced" footer. Server URL and log path live in a Diagnostics drawer behind the ⋯ menu.
- Floating widget: always-on-top dot/pill/expanded states, draggable, snaps to screen edge, status colour glow (`ok`, `idle`, `fg-3`, `off`).
- Popups (break question, greeting): same surface, radius, type and button styles as the web app. Short, human copy.
- Copy tone: "You’re being tracked", "Paused", never "idle limit 10 min · Claude working".

---

## 11. Never do this

- Navy or blue-dominant surfaces, electric blue-violet, or any purple outside the brand scale.
- Heavy shadows, thick borders, rainbow chips, or more than one accent colour.
- Gradients on large areas other than the sign-in panel and primary button.
- Tinted off-white or off-black page backgrounds: the page is pure white (light) or pure black (dark).
- Text lighter than `fg-3`, or grey text on a purple panel.
- Bold Outfit headings, or proportional digits for times.
- Feature lists or marketing copy on the sign-in screen.
- Technical details (server URLs, file paths) in the main UI.
- New hex codes, one-off pixel values, or reusing an old component's look just because it exists.

---

## 12. First task to give Claude Code

> Read DESIGN.md. Update `src/theme.css` to match the token table (keep existing names, add missing ones, both themes) and extend the Tailwind theme (radii, shadow-card, fonts). Then build the `components/ui` set. Then rebuild `/login` and `/attendance` from `/design/tracker-light-prototype.html`. Replace existing styling freely. Show me both themes when done.
