# Design System

Light-first design. Optional dark mode via `.dark` on `<html>`.

The visual reference for this app is **Holeswing** — a clean, minimal golf app. We draw on its feel and aesthetic, not its feature set. The guiding principle is **restraint**: green appears rarely and intentionally, white space does the heavy lifting, and typography creates hierarchy without decoration.

No photography or stock imagery is used anywhere. No bottom tab bar — navigation is hamburger + sidebar drawer.

## Colour Palette

### Raw Palette (from Figma)

#### Green (Primary)

| Token    | Hex       |
| -------- | --------- |
| Green 70 | `#10603D` |
| Green 60 | `#18905C` |
| Green    | `#21C17C` |
| Green 40 | `#58D09C` |
| Green 30 | `#90E0BD` |
| Green 20 | `#C7EFDE` |
| Green 10 | `#E9F8F2` |

#### Black (Neutrals)

| Token    | Hex       |
| -------- | --------- |
| Black    | `#000000` |
| Black 50 | `#232C2E` |
| Black 40 | `#5C6363` |
| Black 30 | `#8E9191` |
| Black 20 | `#C6C7C8` |
| Black 10 | `#EDEFEF` |

#### Red (Destructive)

| Token  | Hex       |
| ------ | --------- |
| Red 70 | `#70242A` |
| Red 60 | `#A9363F` |
| Red    | `#E24955` |
| Red 40 | `#E9767F` |
| Red 30 | `#F0A4AA` |
| Red 20 | `#F7D1D4` |
| Red 10 | `#FCEDEE` |

#### Blue (Info)

| Token   | Hex       |
| ------- | --------- |
| Blue 70 | `#1B4F6D` |
| Blue 60 | `#2977A4` |
| Blue    | `#379FDC` |
| Blue 40 | `#69B7E4` |
| Blue 30 | `#9BCFED` |
| Blue 20 | `#CCE6F6` |
| Blue 10 | `#EBF5FB` |

#### Orange (Warning / Accent)

| Token     | Hex       |
| --------- | --------- |
| Orange 70 | `#7F511F` |
| Orange 60 | `#BF7A2F` |
| Orange    | `#FFA340` |
| Orange 40 | `#FFBA6F` |
| Orange 30 | `#FFD19F` |
| Orange 20 | `#FFE7CF` |
| Orange 10 | `#FFF5EC` |

#### Purple

| Token     | Hex       |
| --------- | --------- |
| Purple 70 | `#36235E` |
| Purple 60 | `#52358E` |
| Purple    | `#6E48BE` |
| Purple 40 | `#9275CE` |
| Purple 30 | `#B6A3DE` |
| Purple 20 | `#DAD1EE` |
| Purple 10 | `#F0EDF8` |

#### White / Surface

| Token    | Hex       |
| -------- | --------- |
| White    | `#FFFFFF` |
| White 50 | `#F5F7F8` |

---

### Semantic Tokens

| Token             | Light     | Dark      | Usage                              |
| ----------------- | --------- | --------- | ---------------------------------- |
| `background`      | `#F5F7F8` | `#1A2022` | Page background                    |
| `foreground`      | `#232C2E` | `#FFFFFF` | Primary text                       |
| `card`            | `#FFFFFF` | `#232C2E` | Card / elevated surface            |
| `card-foreground` | `#232C2E` | `#FFFFFF` | Text on cards                      |
| `popover`         | `#FFFFFF` | `#232C2E` | Dropdown / popover background      |
| `primary`         | `#21C17C` | `#21C17C` | Primary actions, links, indicators |
| `primary-fg`      | `#FFFFFF` | `#FFFFFF` | Text on primary surfaces           |
| `secondary`       | `#EDEFEF` | `#2C3537` | Secondary buttons, subtle fills    |
| `secondary-fg`    | `#232C2E` | `#FFFFFF` | Text on secondary surfaces         |
| `muted`           | `#EDEFEF` | `#2C3537` | Disabled / placeholder backgrounds |
| `muted-fg`        | `#5C6363` | `#8E9191` | Secondary text, captions           |
| `accent`          | `#FFA340` | `#FFA340` | Highlights, warnings               |
| `accent-fg`       | `#232C2E` | `#1A2022` | Text on accent surfaces            |
| `destructive`     | `#E24955` | `#E24955` | Error / destructive actions        |
| `destructive-fg`  | `#FFFFFF` | `#FFFFFF` | Text on destructive surfaces       |
| `border`          | `#C6C7C8` | `#3D4849` | Borders, dividers                  |
| `input`           | `#C6C7C8` | `#3D4849` | Input borders                      |
| `ring`            | `#21C17C` | `#21C17C` | Focus ring                         |
| `info`            | `#379FDC` | `#379FDC` | Info states                        |
| `warning`         | `#FFA340` | `#FFA340` | Warning states                     |

### Surface Elevation

| Token             | Light     | Dark      |
| ----------------- | --------- | --------- |
| `surface-low`     | `#F5F7F8` | `#1A2022` |
| `surface-high`    | `#FFFFFF` | `#232C2E` |
| `surface-highest` | `#EDEFEF` | `#2C3537` |

---

## Typography

Font family: **Inter Variable** (`@fontsource-variable/inter`).

### Scale

| Name      | Size | Weight         | Usage                   |
| --------- | ---- | -------------- | ----------------------- |
| Large 42  | 42px | Bold (700)     | Hero numbers, scores    |
| Large 36  | 36px | Bold (700)     | Large display text      |
| Large 28  | 28px | Bold (700)     | Section hero text       |
| Heading 1 | 24px | Bold (700)     | Page titles             |
| Heading 2 | 22px | Bold (700)     | Section headings        |
| Heading 3 | 20px | Bold (700)     | Subsection headings     |
| Heading 4 | 16px | Bold (700)     | Card headings           |
| Heading 5 | 14px | Bold (700)     | Small headings          |
| Title 20  | 20px | SemiBold (600) | Prominent labels        |
| Title 16  | 16px | SemiBold (600) | Card titles, labels     |
| Title 14  | 14px | SemiBold (600) | Small titles            |
| Title 12  | 12px | SemiBold (600) | Badges, table headers   |
| Title 10  | 10px | SemiBold (600) | Micro labels            |
| Text 20   | 20px | Regular (400)  | Large body text         |
| Text 16   | 16px | Regular (400)  | Standard body text      |
| Text 14   | 14px | Regular (400)  | Body text               |
| Text 12   | 12px | Regular (400)  | Captions, helper text   |
| Text 10   | 10px | Regular (400)  | Fine print, annotations |

### Guidelines

- Use `font-variant-numeric: tabular-nums` for score columns and numeric data.
- Use `text-transform: uppercase; letter-spacing: 0.05em` sparingly for small badges/labels.

---

## Spacing & Layout

Follows Tailwind's default 4px grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

Content max-width for mobile-first PWA: not defined globally (pages handle their own constraints).

---

## Border Radius

Base radius `--radius: 0.75rem` (12px). All tiers derive from this:

| Token       | Value  | Computed | Usage                         |
| ----------- | ------ | -------- | ----------------------------- |
| `radius-sm` | base-4 | 8px      | Small elements, badges, chips |
| `radius-md` | base-2 | 10px     | Inputs, small cards           |
| `radius-lg` | base   | 12px     | Cards, dialogs                |
| `radius-xl` | base+4 | 16px     | Large cards, hero sections    |

---

## Buttons

Three variants, two sizes.

### Sizes

| Size   | Height | Padding (x) | Font Size |
| ------ | ------ | ----------- | --------- |
| Large  | 48px   | 24px        | 16px      |
| Medium | 40px   | 16px        | 14px      |

### Variants

| Variant | Fill        | Border       | Text         |
| ------- | ----------- | ------------ | ------------ |
| Fill    | `primary`   | none         | `primary-fg` |
| Line    | transparent | `foreground` | `foreground` |
| Nude    | transparent | none         | `primary`    |

### States

- **Disabled**: 50% opacity, pointer-events none.
- **Pressed**: Slight scale-down or darken.
- **Focus**: 2px ring using `--ring` (green).

---

## Cards

- Background: `--card` (white in light mode, floats above `#F5F7F8` background)
- Border: 1px `--border` OR no border with subtle shadow
- Border-radius: `radius-lg` (12px)
- Padding: 16px default, 20px for larger cards

---

## Dark Mode

Dark mode is activated by adding `class="dark"` to the `<html>` element. All semantic tokens swap via the `.dark` selector. Green primary and red destructive remain constant across modes.

Dark mode is optional and not yet wired into the UI. When implemented, use a toggle that persists preference to `localStorage` and respects `prefers-color-scheme` as the default.

---

## PWA Theming

| Property           | Value     |
| ------------------ | --------- |
| `theme_color`      | `#F5F7F8` |
| `background_color` | `#F5F7F8` |

These are light-mode values matching the app background. They affect the splash screen and browser chrome on mobile.

---

## Visual Principles

### Green is earned

Green (`--primary`) appears only on: primary CTA buttons, active navigation state, key numeric scores, text links/actions, focus rings, and the floating action button. Never use it decoratively, as a background fill for section headers, or on dividers.

### Cards on background

White cards (`--card`) float on the off-white page background (`--background: #f5f7f8`). This two-tone system creates depth without shadows needing to do heavy work. Use `shadow-sm` on cards — never heavy drop shadows.

### Typography is the hierarchy

Don't use colour or borders to separate content when weight and size can do it. A `font-bold` heading next to `text-muted-foreground` body text creates clear hierarchy without any additional decoration.

### Scores are big and green

Numeric golf scores are always displayed large, bold, and in `text-primary`. They are the most important data on any screen and should never be hidden, de-emphasised, or shown in a neutral colour.

---

## Navigation

**No bottom tab bar.** All navigation uses a **hamburger menu** (top-left of every screen) that opens a **sidebar drawer** sliding in from the left.

### Sidebar structure

1. **Header** — circular avatar (64px) + player name (`text-base font-bold`) + key stats row (HCP · followers)
2. `border-b border-border`
3. **Primary nav items** — icon (20px) + label (`text-sm font-semibold`). Active item uses `text-primary`; inactive uses `text-foreground`.
4. `border-b border-border`
5. **Secondary items** — Settings & Security, Terms, Help Center, About. Style: `text-sm text-muted-foreground`.
6. **Footer** — Log Out. Style: `text-sm text-destructive`.

### Page title bars

Every screen has a consistent header:

- **Back navigation**: left-pointing `ArrowLeft` icon only — no text label.
- **Page title**: left-aligned `text-base font-semibold`. On simple/centred screens it may be centred.
- **Trailing actions**: icon-only buttons (`aria-label` required) — pencil for edit, gear for settings.

---

## Components

### Buttons

**Three variants, two sizes.**

| Variant        | Fill         | Border          | Text                      |
| -------------- | ------------ | --------------- | ------------------------- |
| Fill (default) | `bg-primary` | —               | `text-primary-foreground` |
| Outline        | transparent  | `border-border` | `text-foreground`         |
| Ghost / Nude   | transparent  | —               | `text-primary`            |

| Size             | Height | Horizontal padding | Font                      |
| ---------------- | ------ | ------------------ | ------------------------- |
| Large (lg)       | 48px   | 24px               | `text-base font-semibold` |
| Medium (default) | 40px   | 16px               | `text-sm font-semibold`   |

**Rules:**

- Full-width primary button is the single CTA at the bottom of action/form screens. There should never be more than one green filled button visible at a time.
- Outline is used when paired with a primary button (e.g. Preview | Start Round side by side).
- Ghost is for section "View All" links and low-emphasis inline actions.
- Disabled state uses `bg-secondary text-muted-foreground` — never style this manually, let the variant handle it.
- Focus state: 2px ring using `--ring` (green).

**Floating Action Button (FAB)** — fixed bottom-right, primary creation action on a screen:

```tsx
<button
  className="bg-primary text-primary-foreground fixed right-6 bottom-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
  aria-label="New post"
>
  <PencilIcon className="h-5 w-5" />
</button>
```

### Inputs

- Fill: `bg-surface-highest` (`#edefef`) — light gray, no visible border at rest.
- On focus: `border-ring` green border.
- Border radius: `rounded-sm` (8px).
- Height: 40px (medium), 48px (large form inputs).
- Labels sit above the field (`text-sm font-semibold mb-1`). Never use placeholder-as-label.
- Helper/error text sits below with `text-xs text-muted-foreground` / `text-destructive`.

### Cards

```tsx
<div className="bg-card rounded-lg p-4 shadow-sm">...</div>
```

- Background: `bg-card` (white).
- Radius: `rounded-lg` (12px).
- Shadow: `shadow-sm`.
- Padding: 16px (`p-4`), 20px for larger cards.
- Keep single-responsibility. Do not nest cards inside cards.

### List rows

Consistent pattern throughout the app. Rows use `border-b border-border` to separate — no margin or gap between them.

```
[Leading 40px]  [Primary label   text-sm font-bold            ]  [Trailing]
                [Secondary label text-xs text-muted-foreground]
```

Leading element is typically:

- Circular avatar (40px)
- Icon in a `bg-secondary rounded-md` container

Trailing element is typically:

- A score or stat (`text-primary font-bold`)
- A ghost/outline action button (Follow, View, etc.)
- A `MoreVertical` icon for contextual menu

### Section headers

Bold label flush left, green "View All" ghost button flush right. Always `<h2>` for the label.

```tsx
<div className="mb-3 flex items-center justify-between">
  <h2 className="text-base font-bold">Round History</h2>
  <button className="text-primary text-sm font-semibold">View All</button>
</div>
```

### Score display

Numeric scores are the hero element of any scoring screen. Always large, bold, and green.

```tsx
// Primary score
<span className="text-3xl font-bold text-primary">113</span>

// Score differential / delta badge (dark pill)
<span className="rounded-full bg-foreground text-background text-xs font-semibold px-2 py-0.5">
  +40
</span>
```

Stat rows (HCP · followers · following) use `text-base font-bold` for the number, `text-xs text-muted-foreground` for the label below.

### Badges / pills

```tsx
// Format / category badge (neutral)
<span className="rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1">
  Stroke Play
</span>

// Tee colour badge — background set inline
<span
  className="rounded-full text-white text-xs font-semibold px-3 py-1"
  style={{ backgroundColor: '#e24955' }}
>
  Red
</span>
```

### Avatars

Always circular (`rounded-full`). When no image is available, show initials on `bg-secondary text-secondary-foreground`.

| Size   | Dimensions | Use                            |
| ------ | ---------- | ------------------------------ |
| Large  | 64×64px    | Profile header, sidebar header |
| Medium | 40×40px    | List rows, post headers        |
| Small  | 32×32px    | Compact rows, comments, chips  |

### Bottom sheets

White (`bg-card`), `rounded-t-xl`, drag handle (short rounded bar, `bg-border`) centred at the top. Used for action pickers, option selectors, and confirmations that don't need a full page.

---

## Iconography

Use **Lucide React** exclusively.

| Context                   | Size |
| ------------------------- | ---- |
| Sidebar / toolbar actions | 24px |
| List row leading icons    | 20px |
| Inline / badge icons      | 16px |

No custom illustrations. No photography. Data visualisations use geometric shapes only.

---

## Data Visualisation

Charts (handicap trend, round history performance) follow these rules:

- **Primary series**: `--primary` green (`#21c17c`)
- **Secondary / comparison series**: purple (`#6e48be`) — matches the multi-series chart style in the reference design
- **Axis labels**: `text-[10px] text-muted-foreground`, `tabular-nums`
- **Grid**: horizontal guide lines only, no vertical lines, no chart border
- **Tooltip / callout**: green pill badge — `bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-1`
- **Highlighted point**: filled circle on the line/bar, same colour as the series
