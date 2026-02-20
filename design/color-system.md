# Color System Plan

This document defines how we will implement and use the Princeton Orange palette in Project Eagle with a developer-friendly, consistent, and premium light UI.

## Goals

- Keep the app light, warm, and premium with Linen as the primary canvas.
- Use semantic tokens everywhere so components never hardcode hex values.
- Preserve accessibility by defaulting to Gunmetal on bright surfaces.
- Provide a clean DX with Tailwind v4 utilities (`bg-*`, `text-*`, `border-*`).

## Token Strategy

We will use a two-tier system:

1. **Primitive tokens** for raw palette values (named by color).
2. **Semantic tokens** for functional roles (primary, background, success, etc.).

Tailwind v4 reads `@theme` `--color-*` variables, so we expose both primitive and semantic tokens through `@theme`. Components should use semantic utilities by default.

## Core Palette (Primitives)

| Name             | Hex       | OKLCH                         | CSS Variable         | Tailwind Utility      |
| ---------------- | --------- | ----------------------------- | -------------------- | --------------------- |
| Princeton Orange | `#FF8B2D` | `oklch(0.7504 0.1715 54.01)`  | `--princeton-orange` | `bg-princeton-orange` |
| Linen            | `#FAF1E6` | `oklch(0.9622 0.0175 73.03)`  | `--linen`            | `bg-linen`            |
| Alice Blue       | `#DAEAF6` | `oklch(0.9287 0.0237 240.17)` | `--alice-blue`       | `bg-alice-blue`       |
| Gunmetal         | `#33383B` | `oklch(0.3371 0.0087 234.02)` | `--gunmetal`         | `text-gunmetal`       |
| Emerald          | `#69D7A0` | `oklch(0.7994 0.1296 159.66)` | `--emerald`          | `bg-emerald`          |
| Light Coral      | `#E66D69` | `oklch(0.6781 0.1514 23.82)`  | `--light-coral`      | `bg-light-coral`      |
| Tuscan Sun       | `#F5C253` | `oklch(0.8395 0.1389 83.97)`  | `--tuscan-sun`       | `bg-tuscan-sun`       |
| Blue Grey        | `#5B9BD5` | `oklch(0.6708 0.109 247.51)`  | `--blue-grey`        | `bg-blue-grey`        |
| Silver           | `#C6C6C6` | `oklch(0.8266 0 0)`           | `--silver`           | `border-silver`       |

## Semantic Mapping

| Semantic Token         | Purpose            | Mapped Primitive | Notes                          |
| ---------------------- | ------------------ | ---------------- | ------------------------------ |
| `--background`         | App background     | Linen            | Default canvas color.          |
| `--foreground`         | Primary text       | Gunmetal         | Avoid pure black.              |
| `--primary`            | Brand / CTA        | Princeton Orange | Main action emphasis.          |
| `--primary-foreground` | Text on primary    | Gunmetal         | Higher contrast on orange.     |
| `--secondary`          | Secondary surfaces | Alice Blue       | Large panels or banners.       |
| `--accent`             | Interactive hover  | Alice Blue       | Hover and subtle highlights.   |
| `--muted`              | Subtle fills       | Alice Blue       | Table stripes and soft chips.  |
| `--muted-foreground`   | Subtle text        | Neutral grey     | Reduce emphasis.               |
| `--border` / `--input` | Dividers, inputs   | Silver           | Neutral structure.             |
| `--destructive`        | Errors / delete    | Light Coral      | Destructive intent only.       |
| `--success`            | Positive status    | Emerald          | Success badges, confirmations. |
| `--warning`            | Caution status     | Tuscan Sun       | Warnings and alerts.           |
| `--info`               | Info + links       | Blue Grey        | Info icons, links, focus ring. |
| `--ring`               | Focus ring         | Blue Grey        | Accessible focus state.        |

## Usage Guidelines

- **Default body text:** `text-foreground` on `bg-background`.
- **Primary actions:** `bg-primary text-primary-foreground`.
- **Standard surfaces:** `bg-card` for elevated cards and panels.
- **Secondary surfaces:** `bg-secondary` for tinted panels or banners.
- **Muted surfaces:** `bg-muted/50` for table stripes and subtle blocks.
- **Borders:** `border-border` for dividers, `border-input` for form fields.
- **Destructive:** use `bg-destructive` and `text-destructive-foreground` only for irreversible actions.
- **Links:** prefer `text-foreground underline decoration-info` for readability on Linen.

### Contrast notes

- Orange and Emerald are bright; Gunmetal provides the best contrast for normal text.
- White is acceptable for **large, bold** headings on primary backgrounds but should be avoided for small text.
- Blue Grey is best used for **icons, focus rings, and link decoration**. For inline links, prefer `text-foreground` with `underline decoration-info` to keep contrast strong.

## Developer Experience (DX) Rules

- **Do not hardcode hex values** in components.
- Use **semantic utilities** (`bg-primary`, `text-muted-foreground`, `border-border`).
- Use **primitive utilities** (`bg-princeton-orange`) only for one-off design flourishes.

### Recommended patterns

```tsx
// Primary CTA
<Button className="bg-primary text-primary-foreground">Save</Button>

// Info link with good contrast
<a className="text-foreground underline decoration-info hover:text-primary">
  Learn more
</a>

// Status badge
<Badge className="bg-success text-success-foreground">Synced</Badge>
```

## Implementation Plan

1. **Define primitives and semantics** in `src/styles/globals.css` using `@theme` and `:root`.
2. **Expose success/warning/info tokens** so Tailwind utilities work everywhere.
3. **Refactor UI usage** to favor semantic classes for consistent theming.
4. **Optional polish:**
   - Update toaster colors to use `success`, `warning`, and `info` tokens.
   - Align PWA `theme_color` and `background_color` with the palette.

## Scope

- This palette is **light-mode first**. Dark mode will be addressed later with a dedicated mapping.
