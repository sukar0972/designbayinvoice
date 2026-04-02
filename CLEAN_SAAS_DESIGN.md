# Clean SaaS Design System (Shopify-inspired)

This document outlines the design system and aesthetic guidelines for this project. Use these principles when generating new UI components, pages, or layouts to ensure a consistent, professional, and clean SaaS application feel.

## 1. Core Philosophy

- **Utility First**: The UI should never get in the way of the user's tasks. Functionality dictates form.
- **Restrained & Professional**: Avoid maximalist trends, harsh shadows, and overly decorative elements.
- **High Legibility**: Prioritize clear typography, sufficient contrast, and predictable layouts.

## 2. Typography

- **Primary Font**: `Figtree` (via `next/font/google`). It offers a clean, geometric structure with subtle character, avoiding the overly generic feel of Inter or Roboto while remaining highly legible for data-heavy applications.
- **Weights**:
  - `400` (Regular) for body text and input fields.
  - `500` (Medium) for component labels, table headers, and secondary buttons.
  - `600` (Semi-bold) for page titles, headings, and primary buttons.
- **Sizing**: Use standard Tailwind sizing (`text-xs`, `text-sm`, `text-base`, `text-xl`, `text-2xl`), heavily leaning on `text-sm` for UI elements to maximize data density.

## 3. Color Palette

The palette relies on subtle contrast between the canvas (background) and interactive surfaces (cards).

- **Background (Canvas)**: `#f4f6f8` - A cool, soft light gray that reduces eye strain.
- **Surface (Cards/Modals)**: `#ffffff` - Stark white to lift content off the background.
- **Surface Strong (Headers/Footers in cards)**: `#fafbfb` - A very subtle off-white for structural differentiation within cards.
- **Foreground (Primary Text)**: `#202223` - Dark charcoal, softer than pure black.
- **Muted Text**: `#6d7175` - For secondary information, placeholders, and table headers.
- **Borders**: `#e1e3e5` - Thin, unobtrusive lines for dividing content and defining inputs.
- **Primary Accent**: `#008060` (Deep Green) - Used for primary actions, success states, and focus rings. Avoids the clichéd "SaaS blue" or "purple gradient".
- **Primary Accent Hover**: `#005e46`
- **Danger/Destructive**: `#d82c0d` (Strong Red)

## 4. Component Patterns

### Cards (`.card-surface`)
- **Background**: White (`var(--surface)`).
- **Border Radius**: `0.5rem` (8px).
- **Shadow**: A very soft, multi-layered shadow: `0 0 0 1px rgba(63, 63, 68, 0.05), 0 1px 3px 0 rgba(63, 63, 68, 0.15)`.
- **Structure**: Often split with a `#fafbfb` header section separated by a subtle border, and a white body section.

### Inputs (`.field`)
- **Background**: White.
- **Border**: 1px solid `#e1e3e5`.
- **Border Radius**: `0.25rem` (4px).
- **Padding**: `0.5rem 0.75rem`.
- **Focus State**: `1px solid #008060` with an outer box-shadow ring `0 0 0 1px #008060`. No heavy outlines.

### Buttons (`.btn`)
- **Base Style**: `0.25rem` border radius, `text-sm` font size, `font-medium` (500 weight).
- **Primary**: Deep green background, white text, no visible border. Hover state darkens the background.
- **Secondary**: White background, dark charcoal text, `1px solid #c9cccf` border. Hover state applies a very light gray background (`#f6f6f7`).
- **Shadow**: A barely perceptible inner/outer shadow for tactile feel (`0 1px 0 0 rgba(22, 29, 37, 0.05)`). On active click, it depresses `1px` with an inset shadow.

### Status Pills (`.status-pill`)
- **Shape**: Fully rounded (`border-radius: 1rem`), tight padding (`0.125rem 0.5rem`), `text-xs`.
- **Colors**: Soft tinted backgrounds with darker matching text (e.g., Light blue background `#e0f2fe` with dark blue text `#006eb3` for an "Issued" state).

## 5. Layout & Composition

- **Application Shell**: Admin dashboard style.
  - Sticky sidebar on the left (white background, thin right border).
  - Main content area on the right (light gray background, max-width constrained for readability).
- **Spacing**: Generous padding around the main layout (`p-4` to `p-8` depending on breakpoint), but tighter grouping inside cards (`gap-4` or `space-y-4`).
- **Data Presentation**: Prefer clean data tables with borders only on the bottom of rows (not between columns) over grids of individual cards when displaying lists of items.

## 6. Implementation Notes for AI

- **Do NOT** use large drop shadows (`shadow-lg`, `shadow-xl`).
- **Do NOT** use heavy border radii (`rounded-2xl`, `rounded-3xl`) unless explicitly requested.
- **Do NOT** use vibrant gradients or purely decorative background patterns/noise.
- **ALWAYS** use the CSS variables defined in `app/globals.css` (e.g., `var(--background)`, `var(--accent)`) instead of hardcoding hex values or relying on default Tailwind color names like `blue-500` or `gray-100`.