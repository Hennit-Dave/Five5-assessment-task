# Nit's Cut — Typography Divergences from the M3 2021 Baseline Scale

Status: created in Figma (`ws3fJaZYN6oRFm3dQMIiXm`, page `03 · Typography & shadows`) and reviewed on 2026-10-30.

The comparisons below use **the M3 2021 baseline scale** (as documented in the [official Flutter `TextTheme` reference](https://api.flutter.dev/flutter/material/TextTheme-class.html) and [Android Compose Material 3 typography guide](https://developer.android.com/develop/ui/compose/designsystems/material3)) as the reference default.

---

## 1. Font Family: Two-Font Pairing vs. Single Baseline Sans-Serif

- **M3 2021 baseline default:** `Roboto` across all 15 styles (`Display`, `Headline`, `Title`, `Body`, `Label`).
- **What we chose:** `Cormorant Garamond` for `Display` and `Headline` (6 styles), paired with `Manrope` for `Title`, `Body`, and `Label` (9 styles).
- **Why:** `Cormorant Garamond` gives top-level headings an expressive, tailored character suited to bespoke men's native wear, trousers, and shirts, while `Manrope` provides a modern, minimalistic sans-serif structure for order stages, dates, payment records, and controls.
- **When this choice would be unsuitable:** For a highly compact administrative interface where information density and loading performance matter more than expressive headings, a single sans-serif family could be more appropriate (loading two separate font families adds extra font asset overhead compared with one). Similarly, using `Cormorant Garamond` for small `11px–14px` UI labels or dense form inputs could reduce readability on smaller screens because of its higher stroke contrast, and would require testing.

## 2. Font Weight: Semibold (`600`) Hierarchy vs. Baseline Regular (`400`) and Medium (`500`)

- **M3 2021 baseline default:** `400` (Regular) for all `Display`, `Headline`, `Title Large`, and `Body` styles; `500` (Medium) for `Title Medium`, `Title Small`, and all `Label` styles.
- **What we chose:** `600` (Semibold) for all `Display`, `Headline`, `Title`, and `Label` styles, keeping `400` (Regular) for `Body`.
- **Why:** Using `600` gives `Cormorant Garamond` firmer stroke presence in headings and gives `Manrope` `Title` and `Label` styles stronger visual hierarchy against `400` `Body` text.
- **When this choice would be unsuitable:** On a dense screen containing many simultaneous labels, badges, and table headers, setting every `Title` and `Label` to `600` Semibold could make too many elements compete for attention at once. It would also be unsuitable for long multi-line body paragraphs, where `600` weight would feel heavy.

## 3. Letter Spacing (Tracking): Custom Role Values vs. Baseline Tracking

- **M3 2021 baseline default:**
  - `Display`: Large `-0.25px`, Medium `0px`, Small `0px`.
  - `Headline`: Large `0px`, Medium `0px`, Small `0px`.
  - `Title`: Large `0px`, Medium `+0.15px`, Small `+0.1px`.
  - `Body`: Large `+0.5px`, Medium `+0.25px`, Small `+0.4px`.
  - `Label`: Large `+0.1px`, Medium `+0.5px`, Small `+0.5px`.
- **What we chose:**
  - `Display`: `-0.5px` on Display Large (visually compared against `0px` font-default tracking at `57px` in `evidence/03-spacing-default.png` and `evidence/04-spacing-chosen.png`), and `-0.5px` also applied to Display Medium (`45px`) and Display Small (`36px`).
  - `Headline`, `Title`, and `Body`: `0px` across all nine styles.
  - `Label`: `+0.2px` across all three styles (`14px`, `12px`, `11px`).
- **Why:** In our `57px` Display Large specimen, `-0.5px` makes the heading slightly more compact horizontally than `0px` default tracking, with no obvious letter collisions in the tested sample (note that the screenshots only test `57px` Display Large, not Medium or Small). We retained `0px` default spacing for `Headline`, `Title`, and `Body` to avoid unnecessary compression or widening, and used `+0.2px` on `Label` styles to keep small `Manrope` Semibold control text slightly open.
- **When this choice would be unsuitable:** Applying negative tracking (`-0.5px`) to small body text, form fields, or compact labels could reduce readability and would require testing. Likewise, if Display Medium or Small headings use glyph combinations not present in our sample, `-0.5px` could bring adjacent serifs too close together and would need visual checking at those sizes.

## 4. Line Height: Formula Multipliers (`1.4`, `1.5`, `1.6`) vs. Baseline Pixel Ratios

- **M3 2021 baseline default:** Fixed pixel line heights with tighter ratios on large headings — for example, Display Large `57px / 64px` (`≈ 1.12×`), Display Medium `45px / 52px` (`≈ 1.16×`), Headline Large `32px / 40px` (`1.25×`), Title Large `22px / 28px` (`≈ 1.27×`), Body Large `16px / 24px` (`1.5×`), and Label Large `14px / 20px` (`≈ 1.43×`).
- **What we chose:** While the assessment requires using the formula (`font size × 1.4`, `1.5`, or `1.6`), we deliberately selected which permitted multiplier applies to each role:
  - `× 1.4` for `Display` (`57px → 79.8px`, `45px → 63.0px`, `36px → 50.4px`), `Headline`, and `Label`.
  - `× 1.5` for `Title` (`22px → 33.0px`, `16px → 24.0px`, `14px → 21.0px`).
  - `× 1.6` for `Body` (`16px → 25.6px`, `14px → 22.4px`, `12px → 19.2px`).
- **Why:** Within the permitted formula values, we chose the smallest multiplier (`1.4`) for `Display`, `Headline`, and `Label` to keep headings and single-line controls relatively compact, `1.5` to give wrapping card titles moderate separation, and `1.6` to give multi-line notes and delay explanations more vertical breathing room.
- **When this choice would be unsuitable:** On compact mobile viewports or dense dashboards with multi-line hero headings, a `1.4×` line height on Display Large (`79.8px` vs. the M3 2021 baseline's `64px`) uses substantially more vertical space and pushes primary content further down the screen. Conversely, if `Body` text is displayed in narrow columns where vertical space is tight, `1.6×` may spread short notes across taller cards than necessary.

---

## Historical Note — Superseded `Inter` Proposal (2026-10-29)

An earlier AI-assisted draft proposed `Inter` across all 15 styles with `-1px` tracking on Display Large (captured in `outputs/typography-shadows/display-default-spacing.png` and `display-chosen-spacing.png`). That proposal was superseded on 2026-10-29 when the learner selected the `Cormorant Garamond` Semibold + `Manrope` pairing and `-0.5px` Display tracking (captured in `evidence/03-spacing-default.png` and `evidence/04-spacing-chosen.png`). The earlier `Inter` files are retained in `outputs/` for provenance only and do not represent the active design system.
