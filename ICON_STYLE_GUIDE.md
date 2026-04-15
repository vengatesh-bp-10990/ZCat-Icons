# ZCat Icons — Style Guide

> Reference guide for all icons in the ZCatalyst Design System.
> Every icon added to ZCat Icons **must** follow these rules exactly.

---

## Source

- **Figma File**: [ZCatalyst Design System](https://www.figma.com/design/dwQLnT4eJ3zCaOwhk7JXIn/ZCatalyst-Design-System?node-id=797-4472&m=dev)
- **Frame**: `Icon Selected` (node `797:4472`)
- **Total Icons**: 382 stroke icons

---

## SVG Attributes

### Root `<svg>` element

| Attribute   | Value                               |
|-------------|-------------------------------------|
| `width`     | `16`                                |
| `height`    | `16`                                |
| `viewBox`   | `0 0 16 16`                         |
| `fill`      | `none`                              |
| `xmlns`     | `http://www.w3.org/2000/svg`        |

### Stroke Properties (on every `<path>`, `<circle>`, `<rect>`, `<line>`, etc.)

| Attribute           | Value       |
|---------------------|-------------|
| `stroke`            | `#101F3E`   |
| `stroke-width`      | `1.3`       |
| `stroke-linecap`    | `round`     |
| `stroke-linejoin`   | `round`     |

### Fill

- Root `<svg>`: `fill="none"`
- Shape elements: **No fill** (stroke-only icons)
- Exception: Some icons use `fill-rule="evenodd"` with `clip-rule="evenodd"` for complex enclosed shapes (e.g., `heart`). The path still uses stroke, not solid fill.

---

## Grid & Spacing

- **Canvas**: 16×16px
- **Icon content area**: Paths should stay within the 16×16 viewBox
- **Stroke alignment**: `CENTER` (Figma default)
- **Optical balance**: Icons are visually centered within the frame

---

## Style Rules

### 1. Stroke Only
All icons are **outline/stroke style**. No solid fills, no duotone variants.

### 2. Rounded Ends & Joins
- `stroke-linecap="round"` — line endings are rounded
- `stroke-linejoin="round"` — corners where lines meet are rounded

### 3. Consistent Weight
- `stroke-width="1.3"` — uniform across all icons, no exceptions

### 4. Single Color
- `stroke="#101F3E"` — dark navy (Figma variable: `VariableID:81:15463`)
- When used in apps, replace with `currentColor` for theming:
  ```html
  <svg ... stroke="currentColor" ...>
  ```

### 5. No Extra Elements
- No `<defs>`, `<clipPath>`, `<mask>`, `<style>`, `<g>` wrappers (unless grouping multiple paths)
- No `class`, `id`, `data-*`, or inline `style` attributes
- No `<title>` or `<desc>` elements

### 6. Path Data
- Keep path `d` values exactly as exported from Figma
- Do NOT manually modify coordinates
- Decimal precision: up to 5 decimal places (as exported)

---

## Naming Convention

| Rule              | Example                          |
|-------------------|----------------------------------|
| **Format**        | `kebab-case`                     |
| **Base name**     | `arrow`, `check`, `calendar`     |
| **Variants**      | `arrow-narrow-down`, `check-circle` |
| **Numbered**      | `building-01`, `server-03`       |
| **Actions**       | `alarm-clock-plus`, `file-minus-02` |
| **States**        | `eye-off`, `wifi-off`, `lock-unlocked-01` |

---

## Categories

Icons are organized into these groups:

| Category        | Examples                                           |
|-----------------|----------------------------------------------------|
| **General**     | activity, anchor, archive, bookmark, check, zap    |
| **Arrows**      | arrow-narrow-*, chevron-*, corner-*                |
| **Development** | browser, code-*, database, server-*, terminal      |
| **Commerce**    | currency-*, gift, receipt, shopping-bag, wallet    |
| **Maps**        | flag, globe-*, marker-pin-*, navigation-*, route   |
| **Time**        | alarm-clock-*, calendar-*, clock-*, hourglass      |
| **Media**       | camera-*, flash, image-*, colors                   |
| **Files**       | file-*, folder-*, paperclip, clipboard             |
| **Users**       | user-*, users-*                                    |
| **Alerts**      | alert-*, bell-*, notification-*, announcement      |
| **Communication** | inbox, mail-*, message-*, phone, send            |
| **Devices**     | airplay, battery-*, bluetooth-*, laptop, tablet    |
| **Security**    | face-id, fingerprint-*, lock-*, shield-*, key      |
| **Editor**      | align-*, bold, italic, pen-tool-*, type-*          |
| **Education**   | book-*, certificate-*, graduation-hat-*, award     |
| **Weather**     | Moon, Sun                                          |

---

## Adding New Icons

When adding a new icon to ZCat Icons:

1. **Design** the icon following the style rules above (or provide raw SVG to be styled)
2. **Normalize** the SVG to match these attributes:
   ```xml
   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
     <path d="..." stroke="#101F3E" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
   </svg>
   ```
3. **Name** it using kebab-case following existing conventions
4. **Categorize** it into an existing category (or create a new one if needed)
5. **Tag** it with 4-6 relevant search keywords
6. **Upload** via the admin panel or API

### Styling a Raw SVG

If you have an SVG that doesn't match the style guide:

1. Set viewBox to `0 0 16 16` and size to `16×16`
2. Scale path coordinates to fit within the 16×16 grid
3. Convert fills to strokes where possible
4. Apply: `stroke="#101F3E" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"`
5. Remove all fills (set `fill="none"` on root)
6. Remove unnecessary elements (`<defs>`, `<style>`, classes, IDs)

---

## Template

```xml
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="[PATH_DATA]" stroke="#101F3E" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

For multi-path icons:

```xml
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="[PATH_1]" stroke="#101F3E" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="[PATH_2]" stroke="#101F3E" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

---

## Color Reference

| Token                | Hex       | RGB            | Usage         |
|----------------------|-----------|----------------|---------------|
| Icon Default         | `#101F3E` | `rgb(16,31,62)` | Stroke color |
| Figma Variable       | `VariableID:81:15463` | — | Design token |
