# Information Design: Crafting Context, Visual Hierarchy, and Responsive Resilience

File: `docs/information-design.md`  
Task: Task 2 — Step 10 Information Design  
Author: Learner (Nit's Cut Client Portal)  
Date: 2026-11-01  

---

## 1. The Head: Configuration, Identity, and Discoverability

Configuration lives in the `<head>`, dictating how the application identifies itself to the browser, search engines, and social graph cards before a single pixel renders.

### The Five Head Elements Verified:

1. **Dynamic Page Title (Route-Driven Across Two Meaningful Routes):**  
   - **Route 1 (`GET /`):** `<title>Nit's Cut — Bespoke Men's Tailoring</title>`
   - **Route 2 (`GET /services`):** `<title>Bespoke Tailoring Services — Nit's Cut</title>`
   - *Proof:* Captured in [`evidence/16-head-route-one.png`](../evidence/16-head-route-one.png) and [`evidence/17-head-route-two.png`](../evidence/17-head-route-two.png), proving the `<title>` tag and rendered header update dynamically across two meaningful, navigable application routes without requiring mock product features.

2. **Short Brand Tagline (Under 10 Words):**  
   - Exact text: *"Handcrafted Nigerian native wear, fitted trousers and bespoke shirts."* (9 words).  
   - Embedded as the standard fallback description across client views.

3. **Curated SEO & Robots Directives:**  
   - Web crawlers default to `index, follow` whenever a `robots` meta tag is missing. Omitting the tag does *not* prevent indexing.
   - Therefore, on public marketing routes (`GET /` and `GET /services`), we render:
     ```html
     <meta name="keywords" content="Nit's Cut, bespoke tailoring, Nigerian native wear, senator suit, fitted trousers, Lagos tailor">
     <meta name="robots" content="index, follow">
     ```
   - On error or private client-specific paths, we explicitly enforce:
     ```html
     <meta name="robots" content="noindex, nofollow">
     ```
     ensuring search engines are explicitly instructed never to index non-marketing or temporary error states.

4. **Self-Crafted SVG Favicon:**  
   - Designed and built as a lightweight vector asset ([`app/public/favicon.svg`](../../app/public/favicon.svg)).  
   - Utilizes Nit's Cut royal blue brand color (`#213DA0`), rounded corners (`rx="6"`), and centered bold "NC" monogram in Manrope typography, linked via `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`.

5. **Open Graph Protocol Tags & Social Preview Card:**  
   - Configured with semantic Open Graph tags in `<head>`:
     ```html
     <meta property="og:site_name" content="Nit's Cut">
     <meta property="og:title" content="Nit's Cut — Bespoke Men's Tailoring">
     <meta property="og:description" content="Handcrafted Nigerian native wear, fitted trousers and bespoke shirts.">
     <meta property="og:type" content="website">
     <meta property="og:image" content="/images/nc-og-preview.png">
     ```
   - We crafted a dedicated 1200×630 raster social card at [`app/public/images/nc-og-preview.png`](../../app/public/images/nc-og-preview.png).
   - *Important Distinction:* While local metadata verification tests confirm that the Open Graph meta properties are rendered in the HTML document, an external sharing-preview test (e.g. on WhatsApp or Twitter card validator) requires a publicly accessible, absolute URL (`https://your-domain.com/...`). We do not claim external crawler verification until the application is deployed to a publicly reachable domain.

---

## 2. The Body: Purposeful Content, Collapsed Choices, and Typography

Information design is what transforms raw application functionality into clear, decisive communication.

### 1. Removing Visual Clutter: The Redundant Status Pill
- **What Was Removed:** In earlier wireframes, the topbar contained a pill badge reading: `"Client Portal · Minimal Scaffold"`.
- **Why It Was Removed:** The adjacent brand logo and hero section already established that the visitor is in the client portal. On narrow mobile viewports (<400px), this badge forced the header into an awkward two-row wrap, pushing core content down. Removing it restored visual calm and header elegance.

### 2. Collapsing Choices: Overcoming Booking Paralysis
- **Initial Choice Dilemma:** Early tailoring booking concepts presented visitors with two separate buttons: *"Book Measurement Consultation"* vs. *"Submit Custom Order Specs"*.
- **The Cognitive Issue:** For bespoke tailoring, customer measurements and fabric specifications are intrinsically linked. Making a new visitor decide between them before knowing the process creates friction and abandonment.
- **The Collapsed Action:** We unified this into a single, unambiguous primary action: **"Register Bespoke Garment Inquiry"**. The unified form captures client contact, desired native wear style, fabric choice, and proposed fitting date in one seamless step.

### 3. Deliberate Heading Max-Width & Line Wrapping
- **The Rule:** The main headline (`<h1>`) must wrap into a balanced, deliberate silhouette rather than leaving an orphaned single word dangling at arbitrary viewport widths.
- **Token Applied:** `--nc-layout-heading-max: 22ch` (from `nc-layout-tokens.css`).
- **Visual Proof:**
  - **Bad Wrap ([`evidence/18-heading-wrap-bad.png`](../evidence/18-heading-wrap-bad.png)):** Without a constrained max-width at 780px viewport, the text expands to fill the container and dangles the single word *"Platform"* on line 3, creating an unbalanced ragged right edge.
  - **Good Wrap ([`evidence/19-heading-wrap-good.png`](../evidence/19-heading-wrap-good.png)):** With `max-width: 22ch`, the title wraps cleanly into three structured, rhythmic phrases:
    ```text
    Nit's Cut Workshop &
    Order Platform
    ```

### 4. Button Sizing in rem Units and Corner Radius
- **Padding:** Vertical: `var(--nc-button-padding-block)` = `0.625rem` (`10px` at 16px base); Horizontal: `var(--nc-button-padding-inline)` = `1rem` (`16px`).
- **Corner Radius:** `var(--nc-radius-button)` = `0.5rem` (`8px`).
- **Why rem Sizing Matters:** Fixed pixel widths (`width: 200px; height: 48px;`) break when users increase browser default font sizes for low vision, causing labels to truncate or overflow. Using `rem` padding ensures the button container expands naturally with text size while maintaining proportional touch target padding.

### 5. Task 1 Label Typography Applied to Buttons
- The `.btn` class in `app/public/css/app.css` strictly consumes the Task 1 design system tokens for label typography:
  - Font family: `var(--nc-type-label-large-family)` (`"Manrope", system-ui, sans-serif`)
  - Font weight: `var(--nc-type-label-large-weight)` (`600`)
  - Font size: `var(--nc-type-label-large-size)` (`0.875rem` / `14px`)
  - Line height: `var(--nc-type-label-large-line-height)` (`1.225rem`)
  - Letter spacing / tracking: `var(--nc-type-label-large-tracking)` (`0.2px`)

---

## 3. Interaction and Fluid Responsiveness

### 6. Interactive States & Brand Navigation
- All interactive controls (`.btn`, `.brand`, inputs) display `cursor: pointer` behavior.
- The topbar brand badge and name are wrapped in `<a href="/" class="brand">`, providing an intuitive, universal path home from anywhere in the application.
- Subtle hover transitions (`opacity: 0.85` on brand link; `background-color: var(--nc-color-surface-tint)` and `-0.0625rem` subtle elevation on `.btn-primary`) offer immediate tactile feedback without distracting micro-animations.
- Focus-visible styling is explicitly applied with `--nc-focus-ring-width: 2px` and `--nc-focus-ring-offset: 2px` across all buttons and inputs.

### 7. Responsive Text Scaling with `clamp()` Across Three Widths
- To prevent display headlines from overflowing mobile screens or requiring clumsy media queries at every breakpoint, we implemented fluid typography scaling via documented layout tokens:
  ```css
  /* Defined in nc-layout-tokens.css */
  --nc-type-display-fluid-size: clamp(2rem, 3.5vw + 1rem, var(--nc-type-display-large-size));
  --nc-type-display-fluid-line-height: 1.15;

  /* Consumed in app.css */
  .hero-title {
    font-size: var(--nc-type-display-fluid-size);
    line-height: var(--nc-type-display-fluid-line-height);
  }
  ```
- **Visual Verification ([`evidence/20-responsive-three-widths.png`](../evidence/20-responsive-three-widths.png)):**
  - **Desktop (1280px):** Display headline renders at full impact (`3.5625rem` / `57px`), with feature cards and form controls arranged in a spacious multi-column grid.
  - **Tablet (768px):** Headline scales fluidly to `~2.8rem`, grid adapts to 2 columns, zero clipping.
  - **Mobile (375px):** Headline scales down smoothly to `2.2rem` without word hyphenation or container blowout; form fields and tables stack into a single column with horizontal scroll safety on data tables.

