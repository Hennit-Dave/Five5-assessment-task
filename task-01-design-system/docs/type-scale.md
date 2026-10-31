# Nit's Cut — Typography Scale

Status: created in Figma (`ws3fJaZYN6oRFm3dQMIiXm`, page `03 · Typography & shadows`) and visually reviewed on 2026-10-29. Selected pairing: `Cormorant Garamond` Semibold (`600`) for Display and Headline; `Manrope` Semibold (`600`) for Title and Label, and `Manrope` Regular (`400`) for Body. Values below are recorded in Figma pixels; use scalable units (`rem`/`clamp`) when implementing the application.

## 1. Fifteen Typography Styles

| Role | Font family | Weight | Size (px) | Letter spacing (px) | Line height (px) | Multiplier |
|---|---|---:|---:|---:|---:|---:|
| Display Large | Cormorant Garamond | 600 | 57 | -0.5 | 79.8 | 1.4 |
| Display Medium | Cormorant Garamond | 600 | 45 | -0.5 | 63.0 | 1.4 |
| Display Small | Cormorant Garamond | 600 | 36 | -0.5 | 50.4 | 1.4 |
| Headline Large | Cormorant Garamond | 600 | 32 | 0 | 44.8 | 1.4 |
| Headline Medium | Cormorant Garamond | 600 | 28 | 0 | 39.2 | 1.4 |
| Headline Small | Cormorant Garamond | 600 | 24 | 0 | 33.6 | 1.4 |
| Title Large | Manrope | 600 | 22 | 0 | 33.0 | 1.5 |
| Title Medium | Manrope | 600 | 16 | 0 | 24.0 | 1.5 |
| Title Small | Manrope | 600 | 14 | 0 | 21.0 | 1.5 |
| Body Large | Manrope | 400 | 16 | 0 | 25.6 | 1.6 |
| Body Medium | Manrope | 400 | 14 | 0 | 22.4 | 1.6 |
| Body Small | Manrope | 400 | 12 | 0 | 19.2 | 1.6 |
| Label Large | Manrope | 600 | 14 | 0.2 | 19.6 | 1.4 |
| Label Medium | Manrope | 600 | 12 | 0.2 | 16.8 | 1.4 |
| Label Small | Manrope | 600 | 11 | 0.2 | 15.4 | 1.4 |

## 2. Line-Height Multipliers (`1.4`, `1.5`, `1.6`)

Every style follows the assessment's line-height formula (`font size × 1.4`, `1.5`, or `1.6`). Because readability also depends on the typeface, line length, and layout, these multipliers represent our design choices for Nit's Cut rather than universal rules:

- **Display and Headline (`× 1.4`):** We chose `1.4` for short headings so that if a heading wraps on a smaller screen, the lines stay relatively compact.
  - *Display Large note:* Display Large uses `57 × 1.4 = 79.8px`. I chose the smallest permitted multiplier to keep wrapping headings relatively compact. At `1.5`, the line height would increase to `85.5px`, adding vertical space. At `1.3`, it would decrease to `74.1px`, but that falls outside the assessment's formula. A two-line comparison would be needed to judge the visual trade-offs confidently.
- **Title (`× 1.5`):** We chose `1.5` for card headings and order summaries to give moderate separation when a garment title or section header wraps.
- **Body (`× 1.6`):** We chose `1.6` to give multi-line notes (such as delay explanations or payment notes) more vertical breathing room.
- **Label (`× 1.4`):** We chose `1.4` for short control text inside buttons, badges, and form labels; touch-target size and control padding remain separate from text line height.

## 3. Letter-Spacing Judgment and Display Large Comparison

- **Display Large visual comparison (`evidence/03-spacing-default.png` vs `evidence/04-spacing-chosen.png`):**
  Both screenshots capture `Cormorant Garamond` Semibold (`600`) at `57px / 79.8px` displaying *"Made to fit. Ready to plan."* (`03-spacing-default.png` at `0px` tracking; `04-spacing-chosen.png` at `-0.5px` tracking). Note that `0px` is the font's unadjusted default tracking for this comparison, whereas the Material 3 baseline Display Large tracking is `-0.25px`. Compared with `0px`, the chosen `-0.5px` spacing makes the heading slightly more compact horizontally, with no obvious collisions in this sample.
- **Headline, Title, and Body (`0px`):** We retained default (`0px`) spacing for Headline, Title, and Body styles to avoid unnecessary compression, particularly in smaller text.
- **Label (`+0.2px`):** We added `+0.2px` tracking to Label styles (`11px–14px` `Manrope` Semibold) to give compact UI control labels slight extra separation.

## 4. Planned Usage Rules and Size Boundaries

- **Role assignments:** Use Display for short introductory text, Headline for page headers, Title for order cards and section headers, Body for multi-line explanations, and Label for buttons, badges, and form controls. Do not use Display Large on narrow phones without responsive sizing (`clamp`).
- **Smallest styles (`Body Small 12px`, `Label Small 11px`):** Limit these to secondary metadata. They should not be the default for important delivery dates, payment balances, or main actions, and they need checking at actual display size when the interface is built.
