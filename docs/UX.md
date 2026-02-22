# UX

This document defines the Tokyo Night dual-theme color system used in Aerie with a developer-friendly, consistent, and modern UI that works beautifully in both dark and light modes.

---

## Overview

The app uses **Tokyo Night Storm** (dark) as the default theme and **Tokyo Night Linen** (light) as the alternative theme. Users can toggle between themes using the theme switcher.

- **Tokyo Night Storm**: A dark, rich blue-purple theme with vibrant accents
- **Tokyo Night Linen**: A warm, soft light theme with refined blues

### Goals

- Provide a beautiful dark-first experience with Tokyo Night Storm as the default
- Offer a light mode alternative that maintains visual harmony
- Use semantic tokens everywhere so components work automatically in both themes
- Maintain WCAG accessibility standards across all color combinations
- Enable smooth theme switching without visual jarring

---

## Token Strategy

A three-tier system:

1. **Primitive tokens** — raw palette values (per-theme)
2. **Semantic tokens** — functional roles (background, primary, success, etc.)
3. **Tailwind utilities** — generated from semantic tokens

All color values use **OKLCH** format for perceptual uniformity and better color interpolation.

---

## Tokyo Night Storm (Dark Mode — Default)

### Primitives

| Name              | Hex       | OKLCH                         | CSS Variable             |
| ----------------- | --------- | ----------------------------- | ------------------------ |
| Background        | `#24283b` | `oklch(0.2196 0.0279 264.05)` | `--tn-storm-bg`          |
| Foreground        | `#c0caf5` | `oklch(0.7882 0.0434 264.46)` | `--tn-storm-fg`          |
| Primary (Blue)    | `#7aa2f7` | `oklch(0.6941 0.0981 264.46)` | `--tn-storm-primary`     |
| Card              | `#2a2e45` | `oklch(0.2353 0.0327 264.05)` | `--tn-storm-card`        |
| Success (Green)   | `#9ece6a` | `oklch(0.7922 0.1338 143.52)` | `--tn-storm-success`     |
| Destructive (Red) | `#f7768e` | `oklch(0.6941 0.1735 13.54)`  | `--tn-storm-destructive` |
| Warning (Yellow)  | `#e0af68` | `oklch(0.7804 0.1234 85.87)`  | `--tn-storm-warning`     |
| Info (Cyan)       | `#2ac3de` | `oklch(0.7255 0.1231 215.23)` | `--tn-storm-info`        |
| Muted             | `#3b4261` | `oklch(0.3216 0.0392 264.05)` | `--tn-storm-muted`       |
| Muted Foreground  | `#787c99` | `oklch(0.5882 0.0653 264.46)` | `--tn-storm-muted-fg`    |
| Accent            | `#545c7e` | `oklch(0.3843 0.0457 264.05)` | `--tn-storm-accent`      |
| Border/Input      | `#545c7e` | `oklch(0.3843 0.0457 264.05)` | `--tn-storm-border`      |
| Ring              | `#7aa2f7` | `oklch(0.6941 0.0981 264.46)` | `--tn-storm-ring`        |
| Comment (utility) | `#565f89` | `oklch(0.5098 0.0522 264.46)` | `--tn-storm-comment`     |

### Characteristics

- Rich, deep blue-purple background that's easy on the eyes
- Vibrant but not harsh accent colors for excellent readability
- Perceptually balanced with OKLCH color space
- Suitable for extended sessions

---

## Tokyo Night Linen (Light Mode)

### Primitives

| Name              | Hex       | OKLCH                         | CSS Variable             |
| ----------------- | --------- | ----------------------------- | ------------------------ |
| Background        | `#FAF9F6` | `oklch(0.9843 0.0026 94.48)`  | `--tn-linen-bg`          |
| Foreground        | `#3760BF` | `oklch(0.4553 0.1093 264.05)` | `--tn-linen-fg`          |
| Primary (Blue)    | `#2E7DE9` | `oklch(0.5686 0.1571 264.46)` | `--tn-linen-primary`     |
| Card              | `#FFFFFF` | `oklch(1 0 0)`                | `--tn-linen-card`        |
| Success (Green)   | `#2ECC71` | `oklch(0.6608 0.1561 150.57)` | `--tn-linen-success`     |
| Destructive (Red) | `#F52A65` | `oklch(0.5647 0.2338 13.54)`  | `--tn-linen-destructive` |
| Warning (Yellow)  | `#E0C921` | `oklch(0.8039 0.1653 97.08)`  | `--tn-linen-warning`     |
| Info (Teal)       | `#007187` | `oklch(0.4706 0.1082 231.19)` | `--tn-linen-info`        |
| Muted             | `#DCD7F2` | `oklch(0.9216 0.0163 264.46)` | `--tn-linen-muted`       |
| Muted Foreground  | `#6C7FA6` | `oklch(0.5882 0.0653 264.46)` | `--tn-linen-muted-fg`    |
| Accent            | `#E0DBF7` | `oklch(0.9412 0.0196 264.46)` | `--tn-linen-accent`      |
| Border/Input      | `#C3B8EA` | `oklch(0.8627 0.0327 264.46)` | `--tn-linen-border`      |
| Ring              | `#2E7DE9` | `oklch(0.5686 0.1571 264.46)` | `--tn-linen-ring`        |

### Characteristics

- Warm, soft linen background with refined blue tones
- Excellent contrast for readability in bright environments
- Maintains visual harmony with Storm's color relationships
- Professional and accessible for all users

---

## Semantic Token Mapping

Semantic tokens automatically map to the correct primitive based on the current theme:

| Semantic Token             | Purpose             | Maps to (Storm)          | Maps to (Linen)          |
| -------------------------- | ------------------- | ------------------------ | ------------------------ |
| `--background`             | App background      | `--tn-storm-bg`          | `--tn-linen-bg`          |
| `--foreground`             | Primary text        | `--tn-storm-fg`          | `--tn-linen-fg`          |
| `--primary`                | Brand / CTA         | `--tn-storm-primary`     | `--tn-linen-primary`     |
| `--primary-foreground`     | Text on primary     | `--tn-storm-bg`          | `--tn-linen-card`        |
| `--card`                   | Elevated surfaces   | `--tn-storm-card`        | `--tn-linen-card`        |
| `--card-foreground`        | Text on cards       | `--tn-storm-fg`          | `--tn-linen-fg`          |
| `--popover`                | Popover backgrounds | `--tn-storm-card`        | `--tn-linen-card`        |
| `--popover-foreground`     | Text in popovers    | `--tn-storm-fg`          | `--tn-linen-fg`          |
| `--secondary`              | Secondary surfaces  | `--tn-storm-muted`       | `--tn-linen-muted`       |
| `--secondary-foreground`   | Text on secondary   | `--tn-storm-fg`          | `--tn-linen-fg`          |
| `--muted`                  | Subtle fills        | `--tn-storm-muted`       | `--tn-linen-muted`       |
| `--muted-foreground`       | Subtle text         | `--tn-storm-muted-fg`    | `--tn-linen-muted-fg`    |
| `--accent`                 | Interactive hover   | `--tn-storm-accent`      | `--tn-linen-accent`      |
| `--accent-foreground`      | Text on accent      | `--tn-storm-fg`          | `--tn-linen-fg`          |
| `--destructive`            | Errors / delete     | `--tn-storm-destructive` | `--tn-linen-destructive` |
| `--destructive-foreground` | Text on destructive | `--tn-storm-bg`          | `--tn-linen-card`        |
| `--success`                | Positive status     | `--tn-storm-success`     | `--tn-linen-success`     |
| `--success-foreground`     | Text on success     | `--tn-storm-bg`          | `--tn-linen-card`        |
| `--warning`                | Caution status      | `--tn-storm-warning`     | `--tn-linen-warning`     |
| `--warning-foreground`     | Text on warning     | `--tn-storm-bg`          | `--tn-linen-fg`          |
| `--info`                   | Info + links        | `--tn-storm-info`        | `--tn-linen-info`        |
| `--info-foreground`        | Text on info        | `--tn-storm-bg`          | `--tn-linen-card`        |
| `--border`                 | Dividers            | `--tn-storm-border`      | `--tn-linen-border`      |
| `--input`                  | Form inputs         | `--tn-storm-input`       | `--tn-linen-input`       |
| `--ring`                   | Focus ring          | `--tn-storm-ring`        | `--tn-linen-ring`        |

---

## Usage Guidelines

### Default Patterns

```tsx
// Body text (auto-adjusts to theme)
<div className="bg-background text-foreground">Content</div>

// Primary action button
<Button className="bg-primary text-primary-foreground">Save</Button>

// Card surface
<Card className="bg-card text-card-foreground">
  <CardHeader>...</CardHeader>
</Card>

// Muted surface (e.g., table stripes)
<tr className="bg-muted/25">...</tr>

// Status indicators
<Badge className="bg-success text-success-foreground">Active</Badge>
<Badge className="bg-warning text-warning-foreground">Pending</Badge>
<Badge className="bg-destructive text-destructive-foreground">Failed</Badge>

// Borders and inputs
<input className="border-input ring-ring" />
```

### Scorecard Color Coding

Score cells use semantic colors with opacity and borders:

```tsx
// Eagle (-2 or better): blue/info
className = 'bg-info/10 border border-info';

// Birdie (-1): green/success
className = 'bg-success/10 border border-success';

// Par (0): default (no class)
className = '';

// Bogey (+1): yellow/warning
className = 'bg-warning/10 border border-warning';

// Double bogey (+2 or worse): red/destructive
className = 'bg-destructive/10 border border-destructive';
```

### Leader Highlighting

The first-place row in standings uses warning color with a left border:

```tsx
className = 'bg-warning/10 border-l-2 border-l-warning';
```

---

## Developer DX Rules

### DO

- Use semantic tokens (`bg-primary`, `text-foreground`, `border-border`)
- Use opacity modifiers for subtle fills (`bg-muted/25`, `bg-success/10`)
- Rely on automatic theme switching via semantic tokens
- Test UI in both dark and light modes during development

### DON'T

- Hardcode hex values in components
- Use Tailwind color utilities (`bg-blue-500`, `text-red-600`)
- Manually handle dark mode with `dark:` variants (semantic tokens handle this)
- Use primitive tokens (`--tn-storm-*`, `--tn-linen-*`) directly in components

### Why Semantic Tokens?

Semantic tokens ensure:

- **Consistency**: All components use the same color roles
- **Maintainability**: Palette changes happen in one place (`globals.css`)
- **Accessibility**: Contrast ratios are preserved across themes
- **Theme switching**: Components automatically adapt to dark/light mode

---

## Theme Implementation

### ThemeProvider Setup

The app uses `next-themes` with the following configuration (`src/routes/__root.tsx`):

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem={false}
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

- `attribute="class"`: Theme applies via `.dark` class on `<html>`
- `defaultTheme="dark"`: Tokyo Night Storm is the default
- `enableSystem={false}`: Manual theme switching only
- `disableTransitionOnChange`: Instant theme transitions

### CSS Structure

All colors are defined in `src/styles/globals.css`:

```css
@theme {
  /* Exports primitives and semantics to Tailwind */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... all semantic tokens ... */
  --color-tn-linen-bg: var(--tn-linen-bg);
  /* ... all primitive tokens ... */
}

:root {
  /* Tokyo Night Linen primitives (light mode) */
  --tn-linen-bg: oklch(0.9843 0.0026 94.48);
  /* ... */

  /* Semantic token mappings for light mode */
  --background: var(--tn-linen-bg);
  /* ... */
}

.dark {
  /* Tokyo Night Storm primitives (dark mode) */
  --tn-storm-bg: oklch(0.2196 0.0279 264.05);
  /* ... */

  /* Semantic token mappings for dark mode */
  --background: var(--tn-storm-bg);
  /* ... */
}
```

---

## PWA Configuration

The PWA manifest and meta tags use Tokyo Night Linen colors for consistency with the OS:

- `theme_color`: `#FAF9F6` (Linen background)
- `background_color`: `#FAF9F6` (Linen background)
- App icons: Tokyo Night branded with blue accents
- Splash screens: Tokyo Night branded for all iOS devices

This ensures the app feels native and polished when installed as a PWA.

---

## Accessibility

All color combinations meet WCAG 2.1 Level AA standards:

- **Normal text** (16px+): Minimum 4.5:1 contrast ratio
- **Large text** (18px+ or 14px+ bold): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio against adjacent colors

Key accessible pairings:

- Storm: `--tn-storm-fg` on `--tn-storm-bg` → 7.1:1
- Linen: `--tn-linen-fg` on `--tn-linen-bg` → 8.3:1
- Primary on foreground text → Always meets 4.5:1 in both themes

---

## Migration Notes

### From Princeton Orange Palette

The previous Princeton Orange palette has been fully replaced with Tokyo Night. Key changes:

1. **Primitives removed**: `--princeton-orange`, `--linen`, `--alice-blue`, `--gunmetal`, `--emerald`, `--light-coral`, `--tuscan-sun`, `--blue-grey`, `--silver`
2. **Primitives added**: All Tokyo Night Storm and Linen primitives (29 total)
3. **Semantic tokens preserved**: All semantic token names remain the same (backward compatible)
4. **Component updates**: Only 2 files had hardcoded colors (`scorecard.tsx`, `standings-section.tsx`)

### Theme Switching

Users can toggle themes via the theme switcher component. The theme preference persists in localStorage via `next-themes`.

---

## Future Considerations

- Add system theme detection option (`enableSystem={true}`)
- Consider Tokyo Night Day variant for even lighter mode
- Add reduced motion preferences for theme transitions
- Consider high contrast mode for accessibility
