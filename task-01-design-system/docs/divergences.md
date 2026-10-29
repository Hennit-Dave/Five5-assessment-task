# Proposed deviations from M3

AI-assisted draft; learner must review and explain these choices.

1. Font: M3 baseline uses Roboto; proposed Inter matches the existing Nits Cut foundation and keeps order information visually consistent. Unsuitable if the required writing system lacks glyph coverage or a more expressive brand identity is needed.
2. Weight: baseline display is regular 400; proposed display is 600 for stronger hierarchy. Unsuitable for long text or screens already crowded with bold elements.
3. Line height: baseline Display Large is 57/64; assessment requires 1.4, 1.5 or 1.6. Proposed 57/79.8 uses 1.4. It gives wrapping headings room but uses more vertical space and is unsuitable for dense dashboards.
4. Display tracking: compare Inter default 0px against proposed -1px, holding all other settings constant. This is a proposal until inspected in Figma. It aims to make large headings compact; avoid negative tracking for small text. M3 baseline Display Large tracking is -0.25px, distinct from the font-default 0px comparison.

Sources: https://developer.android.com/develop/ui/compose/designsystems/material3 and https://api.flutter.dev/flutter/material/TextTheme-class.html

Visual review on 2026-10-29: the -1px heading occupies less horizontal space than the 0px version while retaining clear letter separation in this specimen. This is an agent observation, not a learner interview or usability test. Genuine screenshots are in outputs/typography-shadows/.


## Superseding font decision — 2026-10-29

The learner selected Cormorant Garamond Semibold with Manrope. Earlier Inter choices above are historical. Six Display/Headline styles now use Cormorant Garamond 600. Nine Title/Body/Label styles use Manrope, with 400 for Body and 600 for the others. Sizes and line-height multipliers remain unchanged.

Display tracking is now -0.5px, compared visually with 0px in genuine new Figma captures. The chosen version is slightly more compact without visible letter collisions in the sample. This is an agent observation, not a usability test. The previous -1px Inter comparison does not evidence this new font.

Compared with Roboto baseline, the serif headings add a fashion/editorial character selected by the learner; Manrope supports practical order information. Cormorant is unsuitable for small form labels and dense records because its fine strokes lose prominence. Two fonts also add download and maintenance cost versus one. Negative tracking remains unsuitable for small body text.
