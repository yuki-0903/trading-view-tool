# Color Palette

Supports *all* standard Tailwind color utility classes using the following pattern:

```
{property}-{color}-{shade}
```

| Key      | Accepted Values |
|----------|-----------------|
| Property | `accent`, `bg`, `border`, `caret`, `decoration`, `divide`, `fill`, `outline`, `ring`, `shadow`, `stroke`, `text` |
| Color    | `primary`, `secondary`, `tertiary`, `success`, `warning`, `error`, `surface` |
| Shade    | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`, `950` |

**Example:**
```html
<div class="bg-primary-500">...</div>
<div class="border border-secondary-600">...</div>
<svg class="fill-surface-950">...</svg>
```

---

## Color Tables

### Primary
| Shade | Class              |
|-------|--------------------|
| 50    | `bg-primary-50`    |
| 100   | `bg-primary-100`   |
| 200   | `bg-primary-200`   |
| 300   | `bg-primary-300`   |
| 400   | `bg-primary-400`   |
| 500   | `bg-primary-500`   |
| 600   | `bg-primary-600`   |
| 700   | `bg-primary-700`   |
| 800   | `bg-primary-800`   |
| 900   | `bg-primary-900`   |
| 950   | `bg-primary-950`   |

### Secondary
| Shade | Class                |
|-------|----------------------|
| 50    | `bg-secondary-50`    |
| 100   | `bg-secondary-100`   |
| 200   | `bg-secondary-200`   |
| 300   | `bg-secondary-300`   |
| 400   | `bg-secondary-400`   |
| 500   | `bg-secondary-500`   |
| 600   | `bg-secondary-600`   |
| 700   | `bg-secondary-700`   |
| 800   | `bg-secondary-800`   |
| 900   | `bg-secondary-900`   |
| 950   | `bg-secondary-950`   |

### Tertiary
| Shade | Class               |
|-------|---------------------|
| 50    | `bg-tertiary-50`    |
| 100   | `bg-tertiary-100`   |
| 200   | `bg-tertiary-200`   |
| 300   | `bg-tertiary-300`   |
| 400   | `bg-tertiary-400`   |
| 500   | `bg-tertiary-500`   |
| 600   | `bg-tertiary-600`   |
| 700   | `bg-tertiary-700`   |
| 800   | `bg-tertiary-800`   |
| 900   | `bg-tertiary-900`   |
| 950   | `bg-tertiary-950`   |

### Success
| Shade | Class             |
|-------|-------------------|
| 50    | `bg-success-50`   |
| 100   | `bg-success-100`  |
| 200   | `bg-success-200`  |
| 300   | `bg-success-300`  |
| 400   | `bg-success-400`  |
| 500   | `bg-success-500`  |
| 600   | `bg-success-600`  |
| 700   | `bg-success-700`  |
| 800   | `bg-success-800`  |
| 900   | `bg-success-900`  |
| 950   | `bg-success-950`  |

### Warning
| Shade | Class             |
|-------|-------------------|
| 50    | `bg-warning-50`   |
| 100   | `bg-warning-100`  |
| 200   | `bg-warning-200`  |
| 300   | `bg-warning-300`  |
| 400   | `bg-warning-400`  |
| 500   | `bg-warning-500`  |
| 600   | `bg-warning-600`  |
| 700   | `bg-warning-700`  |
| 800   | `bg-warning-800`  |
| 900   | `bg-warning-900`  |
| 950   | `bg-warning-950`  |

### Error
| Shade | Class          |
|-------|----------------|
| 50    | `bg-error-50`  |
| 100   | `bg-error-100` |
| 200   | `bg-error-200` |
| 300   | `bg-error-300` |
| 400   | `bg-error-400` |
| 500   | `bg-error-500` |
| 600   | `bg-error-600` |
| 700   | `bg-error-700` |
| 800   | `bg-error-800` |
| 900   | `bg-error-900` |
| 950   | `bg-error-950` |

### Surface
| Shade | Class             |
|-------|-------------------|
| 50    | `bg-surface-50`   |
| 100   | `bg-surface-100`  |
| 200   | `bg-surface-200`  |
| 300   | `bg-surface-300`  |
| 400   | `bg-surface-400`  |
| 500   | `bg-surface-500`  |
| 600   | `bg-surface-600`  |
| 700   | `bg-surface-700`  |
| 800   | `bg-surface-800`  |
| 900   | `bg-surface-900`  |
| 950   | `bg-surface-950`  |

---

# Contrast Colors

Contrast color values are available for every shade:

```
{property}-{color}-contrast-{shade}
```

---

# Color Pairings

Syntax:

```
{property}-{color}-{lightModeShade}-{darkModeShade}
```

**Examples:**
- `bg-surface-200-800`
- `text-primary-400-600`
- `border-secondary-50-950`

**CSS Example:**
```css
.text-primary-300-700 {
  color: light-dark(var(--color-primary-300), var(--color-primary-700));
}
```

**Equivalent in Tailwind:**
```html
<div class="text-primary-300 dark:text-primary-700">...</div>
```

### Guidelines
- Use shade `950` (light mode) and `50` (dark mode) for **body text**
- Use shade `50` (light mode) and `950` (dark mode) for **background**
- Use static `500` for **branding**
- Use in-between shades for **cards, inputs, etc**

---

# Transparency

Both Skeleton Colors and Color Pairings support Tailwind transparency:

```html
<div class="bg-primary-500/25">
  Primary Color @ 25% transparency
</div>

<div class="bg-surface-50-950/60">
  Surface Pairing 50/950 @ 60% transparency
</div>
```
