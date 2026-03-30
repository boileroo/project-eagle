# Aerie Design System

## 1. Creative North Star

**"Tokyo Night Editorial"** — a high-end editorial aesthetic that treats the screen like the pages of a premium golf lifestyle magazine.

We achieve a signature look through intentional asymmetry, extreme typography scales, and tonal depth. The **Tokyo Night** canvas allows vibrant accents to float like neon light-leaks on a dark fairway. In light mode, **Tokyo Linen**'s soft white canvases mimic clean, premium stationery.

**The signature shift:** We move away from rigid, solid, boxed layouts. Instead, we use expansive space, animated mesh gradients that bleed softly from behind, and highly translucent **glassmorphic containers** that let the background colors shine through, softening the overall UI.

---

## 2. Palette

The palette is rooted in the **Tokyo Night** theme for Dark Mode, and **Tokyo Linen** for Light Mode, providing a clean, crisp equivalent.

### Core Colours

| Role        | Token           | Dark Mode Usage                         | Light Mode Usage                       |
| ----------- | --------------- | --------------------------------------- | -------------------------------------- |
| Background  | `--background`  | Tokyo Night canvas                      | Clean, premium soft white              |
| Foreground  | `--foreground`  | Primary body text (muted lavender)      | Deep charcoal/indigo for text          |
| Primary     | `--primary`     | CTAs, interactive elements, focus rings | Bright blue CTAs, focus rings          |
| Destructive | `--destructive` | Headlines, errors, delete actions       | Headlines, errors, delete actions      |
| Success     | `--success`     | Labels, positive status, category tags  | Labels, positive status, category tags |
| Warning     | `--warning`     | Caution indicators                      | Caution indicators                     |
| Info        | `--info`        | Links, informational accents            | Links, informational accents           |
| Coral       | `--coral`       | Team A accent (salmon-orange)           | Team A accent (salmon-orange)          |
| Purple      | `--purple`      | Team B accent (violet)                  | Team B accent (violet)                 |

### Colour Roles

- **Headings (Destructive/Red):** Used for impact, hero display text, high-level navigation.
- **Labels & Tags (Success/Lime):** Used for form labels, category tags, technical data. Uppercase + tracked.
- **Interactive (Primary/Blue):** Used strictly for action and interaction: buttons, links, focus.
- **Body Text (Foreground):** Never use pure white/black for body copy; use the nuanced foreground token to reduce eye strain.
- **Muted Text:** For secondary descriptions, timestamps, metadata.

---

## 3. Surface Layers & Elevation

Depth is achieved through **glassmorphism** and background bleed rather than heavy, opaque drop shadows.

### The Layering System

| Layer                   | Token            | Usage                           |
| ----------------------- | ---------------- | ------------------------------- |
| Base                    | `--background`   | Page background                 |
| Section                 | `--surface-low`  | Sections, sidebar, subtle lifts |
| Component (Card)        | `--card`         | Cards, panels, containers       |
| Elevated (Inputs/Inset) | `--surface-high` | Input fields, inset areas       |
| Interactive hover       | `--accent`       | Hover backgrounds               |

### The "No-Line" Rule

1px solid opaque borders are prohibited for sectioning. Define boundaries using:

1. **Translucency:** Transitioning between surface tiers using glass effects.
2. **Ghost Borders:** A 4–10% translucent white/black line to catch edges like physical glass.
3. **Negative Space:** Generous spacing to create psychological breaks between blocks.

### Glass Morphism (Core Identity)

All primary surfaces (cards, modals, auth panels, score overlays) use strict glass styling. They do not have solid backgrounds.

- **Dark Mode:** `oklch(0.2 0.028 264.05 / 0.4)` (40% opacity)
- **Light Mode:** `rgba(255, 255, 255, 0.5)` (50% opacity)
- **Blur:** `backdrop-blur(24px)`
- **Border:** Ultra-thin translucent hairline border (e.g. `1px solid oklch(1 0 0 / 0.04)` in dark mode, `rgba(255, 255, 255, 0.8)` in light mode).

_These are globally enforced on `.dark [data-slot='card']` and `[data-slot='card']`._

### Ambient Shadows

Shadows must be deeply diffused:

- **Dark Mode:** `0 24px 48px rgba(0, 0, 0, 0.4)`
- **Light Mode:** `0 8px 30px rgba(0, 0, 0, 0.08)`

---

## 4. Typography

We use typography as a structural element, not just a carrier of information.

### Font Families

| Role              | Font          | CSS Variable     | Tailwind Class |
| ----------------- | ------------- | ---------------- | -------------- |
| Headlines/Display | Space Grotesk | `--font-heading` | `font-heading` |
| Body/UI           | Inter         | `--font-sans`    | `font-sans`    |
| Labels            | Inter         | `--font-sans`    | `font-sans`    |

### Hierarchy Strategy

| Level           | Font          | Colour              | Style                                 |
| --------------- | ------------- | ------------------- | ------------------------------------- |
| Hero/Display    | Space Grotesk | `destructive` (red) | text-4xl to text-6xl, bold            |
| Section Heading | Space Grotesk | `foreground`        | text-xl to text-2xl, semibold         |
| Labels          | Inter         | `success` (lime)    | text-xs, uppercase, tracking-[0.15em] |
| Body            | Inter         | `foreground`        | text-sm to text-base                  |
| Muted/Meta      | Inter         | `muted-foreground`  | text-xs to text-sm                    |
| Action Text     | Inter         | `primary` (blue)    | text-sm, uppercase, tracking-[0.05em] |

### Neon Accents

Instead of a heavy glowing effect, we use color accents mapped cleanly in both modes (e.g., the period in "Welcome back." colored with `text-primary`).

---

## 5. Component Guidelines

### Buttons

- **Primary CTA:** Solid `primary` background with contrast text. Large (`h-12` to `h-14`), fully rounded (`rounded-full`). Uppercase, tracked label text.
- **Secondary/Ghost:** No background, `primary` text, ghost border.

### Cards & Containers

- **Glass style:** Managed automatically by the `[data-slot="card"]` utility. Do not override backgrounds to be solid.
- **Corner Radius:** `rounded-[16px]` is standard for cards.
- **Padding:** `p-6` to `p-8` internally — generous spacing creates an "expensive" feel.
- **No dividers:** Separate sections using surface-tier shifts or extremely faint `border-border/60`.

### Inputs

- **Background:** `surface-high` tone.
- **Corner Radius:** `rounded-xl` to match card aesthetic.
- **Height:** `h-12` to `h-14` for comfortable touch targets.
- **Placeholder:** `muted-foreground` colour.

### Form Labels

- **Style:** Uppercase, tracked (`tracking-[0.15em]`), `success` colour (#9ece6a in dark).
- **Font:** Inter (body font), `text-xs` to `text-sm`, `font-semibold`.

---

## 6. Background Effects

### Animated Mesh Gradient

The app features a global animated `MeshGradient` background that brings the canvas to life.

- **Framer Motion:** Used to slowly drift rich, saturated blobs (Emerald and Rose).
- **Blend Modes:** The gradient blends into the background intelligently.
- **Noise Texture:** An SVG grain overlay is applied (`mix-blend-multiply` in light mode, `mix-blend-screen` in dark mode) to give the application a physical, premium stationery/matte feel.

Because the cards are highly translucent glass, this mesh gradient bleeds beautifully into all foreground surfaces.

---

## 7. Token Architecture

### Two-Tier System

Variables for the **Tokyo Night** (dark) and **Tokyo Linen** (light) palettes are mapped directly in Tailwind v4:

1. **Semantic tokens** — functional roles (`--background`, `--primary`, `--card`, etc.) in OKLCH.
2. **Tailwind utilities** — generated from semantic tokens via the `@theme` block.

All colour values use **OKLCH** format for perceptual uniformity and better colour interpolation.

### Select Semantic Tokens

| Semantic Token   | Purpose                 |
| ---------------- | ----------------------- |
| `--background`   | Page background         |
| `--foreground`   | Primary text            |
| `--primary`      | Brand / CTA             |
| `--card`         | Card/panel surfaces     |
| `--muted`        | Subtle fills            |
| `--destructive`  | Errors, headlines, red  |
| `--success`      | Positive, labels, green |
| `--border`       | Ghost borders           |
| `--coral`        | Team A accent           |
| `--purple`       | Team B accent           |
| `--surface-low`  | Section/sidebar layer   |
| `--surface-high` | Inputs/inset layer      |

---

## 8. Developer Rules

### DO

- Use semantic tokens (`bg-primary`, `text-foreground`, `border-border`)
- Use opacity modifiers for subtle fills (`bg-muted/25`, `bg-success/10`)
- Rely on the default `<Card>` component to automatically inherit the global glass styling.
- Ensure all text over glass surfaces maintains bright/dark enough contrast (e.g. `text-foreground/90`).
- Ensure Light Mode and Dark Mode are structurally identical (1-to-1 color swap).

### DON'T

- Hardcode hex values in components.
- Use solid color backgrounds on `[data-slot='card']` items.
- Use 1px solid opaque borders for sectioning.
- Use pure white (`#fff`) text for body copy — use `foreground` token.
- Apply different DOM structures for Light vs Dark mode (e.g., hiding a divider only in light mode).

---

## 9. Scorecard & Status Colour Coding

### Score Cells

```tsx
// Eagle (-2 or better): info/cyan
className = 'bg-info/10 border border-info';

// Birdie (-1): success/green
className = 'bg-success/10 border border-success';

// Par (0): default
className = '';

// Bogey (+1): warning/amber
className = 'bg-warning/10 border border-warning';

// Double bogey (+2 or worse): destructive/red
className = 'bg-destructive/10 border border-destructive';
```

### Team Colour Coding

Coral and purple are persistent team accent colours across players panel, scorecard, and match result summaries. Managed by `src/lib/team-colours.ts`.

```tsx
<Badge className="bg-coral text-coral-foreground">Team A</Badge>
<Badge className="bg-purple text-purple-foreground">Team B</Badge>
```

---

## 10. Spacing & Rhythm

Generous spacing reinforces the editorial feel:

| Context             | Guideline            |
| ------------------- | -------------------- |
| Section gaps        | `gap-16` to `gap-20` |
| Content grouping    | `gap-4` to `gap-6`   |
| Component internal  | `p-6` to `p-8`       |
| Between form fields | `space-y-5`          |

---

## 11. Accessibility

All colour combinations must meet WCAG 2.1 Level AA:

- **Normal text** (16px+): Minimum 4.5:1 contrast ratio
- **Large text** (18px+ or 14px+ bold): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 against adjacent colours

Key pairings:

- `foreground` on `background` → high contrast
- `destructive` on `background` → meets large text threshold (used for display headings)
- `success` on `background` → meets large text threshold (used for labels)
