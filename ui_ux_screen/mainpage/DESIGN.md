# Design System Document

## 1. Overview & Creative North Star: "The Digital Sanctuary"
This design system is engineered to transform a desktop utility into a contemplative experience. Moving away from the rigid, boxy constraints of traditional Windows applications, our Creative North Star is **"The Digital Sanctuary."** 

The system prioritizes serenity and atmospheric depth. We achieve this through "The Editorial Float"—a layout philosophy that favors generous negative space, intentional asymmetry, and the elimination of harsh structural lines. By utilizing the Windows Mica-effect philosophy (glassmorphism) and a sophisticated palette of deep emeralds, soft browns, and amber, the interface feels less like software and more like a curated, living parchment.

---

## 2. Colors & Tonal Depth
The palette is rooted in expressive tones.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts or tonal nesting. To separate the prayer schedule from the sidebar, move from `surface` to `surface-container-low`.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, semi-translucent layers.
*   **Base Layer:** `surface` (#f7f9fb) – The canvas.
*   **Structural Sections:** `surface-container-low` (#f2f4f6) – Large grouping areas.
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) – To create a "lifted" feel.
*   **Emphasis Zones:** `surface-container-high` (#e6e8ea) – For inactive states or subtle contrast.

### The "Glass & Gradient" Rule
To integrate with the Windows 11 aesthetic, use **Glassmorphism** for floating overlays (e.g., audio controllers). Apply `surface_container_lowest` at 70% opacity with a 20px backdrop blur. 
*   **Signature Gradient:** For primary CTAs (like *Mula Azan*), use a linear gradient: `primary` (#009975) to a complementary shade. This adds "soul" and prevents the deep emerald from feeling flat.

---

## 3. Typography: The Editorial Voice
We utilize **Inter** (or Segoe UI Variable) to bridge the gap between system integration and high-end editorial design.

*   **Display (The Moment):** `display-lg` (3.5rem). Used for the current time or the "Next Prayer" countdown. High contrast against `on_surface`.
*   **Headlines (The Narrative):** `headline-md` (1.75rem). Used for section headers like *"Jadual Waktu Solat"*.
*   **Body (The Information):** `body-md` (0.875rem). Used for secondary details and settings.
*   **Labels (The Utility):`label-md` (0.75rem). All-caps with +5% letter spacing for a premium, architectural feel.

**Hierarchy Note:** Use `on_surface_variant` (#404944) for secondary text to create a soft, legible gray that reduces eye strain during long periods of focus.

---

## 4. Elevation & Depth: Tonal Layering
Depth is not a shadow; it is a relationship between light and surface.

*   **The Layering Principle:** Place a `surface-container-lowest` card atop a `surface-container` background. The subtle shift from #eceef0 to #ffffff creates a natural "lift" without the clutter of shadows.
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use an extra-diffused shadow: `offset-y: 8px, blur: 24px, color: rgba(25, 28, 30, 0.06)`. The tint is derived from `on_surface` to mimic natural occlusion.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#bfc9c3) at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Interface Elements

### Buttons (Butang)
*   **Primary:** Gradient of `primary` to a complementary shade. Text in `on_primary`. Roundedness: `md` (0.375rem).
*   **Tertiary (Ghost):** No background. Text in `primary`. Used for secondary actions like *"Lihat Kiblat"*.

### Cards & Lists (Kad & Senarai)
*   **The "No-Divider" Rule:** Never use horizontal lines to separate prayer times. Use `24px` of vertical white space or alternating backgrounds of `surface` and `surface-container-low`.
*   **Prayer Time Chips:** Use `secondary_container` (#d5e3fc) with `on_secondary_container` text for the "Current Prayer" highlight.

### Audio Controls (Kawalan Audio)
*   **Visualizer:** Use `primary_fixed` (#a6f2d1) for active audio waveforms.
*   **Controls:** Icons should be "Thin" or "Light" weight to maintain the serene aesthetic. Avoid heavy, filled icons unless active.

### Input Fields (Ruangan Input)
*   **State:** Use `surface_container_highest` for the background. On focus, transition the background to `surface_container_lowest` and apply a `primary` ghost border (20% opacity).

---

## 6. Do’s and Don’ts

### Do
*   **Do** use Bahasa Melayu terminology consistently (e.g., *Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak*).
*   **Do** allow the background color to bleed through via glassmorphism in the sidebar.
*   **Do** use asymmetrical margins. A wider left margin for the navigation creates a "Director’s Cut" editorial feel.

### Don’t
*   **Don't** use pure black (#000000). Use `on_surface` (#191c1e) for deep text to keep the palette organic.
*   **Don't** use standard Windows "Accent Blue." Stick strictly to the Emerald, Brown, and Amber tokens provided.
*   **Don't** use sharp corners. Every element must adhere to the Roundedness Scale, primarily `md` and `lg` for a softer, more professional touch.
*   **Don't** clutter. If a feature isn't essential to the "Serene" experience, hide it in a secondary `surface-dim` drawer.

---

## 7. Roundedness Scale
*   **DEFAULT:** `0.25rem` (Minor components)
*   **md:** `0.375rem` (Standard Buttons/Inputs)
*   **lg:** `0.5rem` (Main Cards)
*   **xl:** `0.75rem` (Major Sections/Mica Panels)
*   **full:** `9999px` (Search bars/Pills)