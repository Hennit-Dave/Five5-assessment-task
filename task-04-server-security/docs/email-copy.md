# Branded Verification Email Design & Copy (Task 4 Step 11)

## 1. Manually Mapping Task 1 Design Tokens to Inline Email Styles

Email clients (Gmail, Outlook, Apple Mail) routinely strip `<link>` stylesheets, `<style>` blocks, and CSS custom properties (`var(--nc-*)`), and many desktop clients do not load self-hosted web fonts. To preserve Nit's Cut's Task 1 visual identity across email environments, [`buildVerificationMessage()`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/email.js) uses **manually mapped** literal values copied from [`app/public/css/nc-tokens.css`](file:///Users/blk/Developer/Five5%20assessment%20task/app/public/css/nc-tokens.css) and [`app/public/css/nc-layout-tokens.css`](file:///Users/blk/Developer/Five5%20assessment%20task/app/public/css/nc-layout-tokens.css) into inline `style="..."` attributes (with `bgcolor` attributes on tables and cells).

> **Maintenance Note:** These inline values are manually mapped, **not** automatically synchronized at build time. If Task 1 CSS tokens change in the future, `buildVerificationMessage()` must be updated manually to match.

### Colour Token Mapping (`nc-tokens.css`)
| Role in Email | Task 1 Token | Manually Mapped Value |
| :--- | :--- | :--- |
| Header background & code box border | `--nc-color-primary` (`--nc-ref-primary-40`) | `#334DAF` |
| Header brand title text | `--nc-color-on-primary` (`--nc-ref-primary-100`) | `#FFFFFF` |
| Verification code box background | `--nc-color-primary-container` (`--nc-ref-primary-90`) | `#DDE1FF` |
| Verification code & label text | `--nc-color-on-primary-fixed` (`--nc-ref-primary-10`) | `#001454` |
| Outer email canvas background | `--nc-color-surface` (`--nc-ref-neutral-98`) | `#FBF8FF` |
| Email card background | `--nc-color-surface-container-lowest` (`--nc-ref-neutral-100`) | `#FFFFFF` |
| Greeting & primary text | `--nc-color-on-surface` (`--nc-ref-neutral-10`) | `#1B1B21` |
| Body copy & expiry notice | `--nc-color-on-surface-variant` (`--nc-ref-neutral-variant-30`) | `#45464F` |
| Card border | `--nc-color-outline-variant` (`--nc-ref-neutral-variant-80`) | `#C6C5D0` |

### Typography & Layout Token Mapping (`nc-tokens.css`, `nc-layout-tokens.css`)
| Role in Email | Task 1 Token | Manually Mapped Value & Email Fallback |
| :--- | :--- | :--- |
| Brand heading (`<h1>`) | `--nc-type-headline-medium-*` (`1.75rem`, weight `600`, line-height `2.45rem / 1.75rem = 1.4`) | `'Cormorant Garamond', Georgia, 'Times New Roman', serif`, `28px`, weight `600`, `line-height: 1.4` |
| Body copy | `--nc-type-body-medium-*` (`0.875rem`, weight `400`, line-height `1.4rem / 0.875rem = 1.6`) | `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`, `14px`, `line-height: 1.6` |
| Small caption / footer | `--nc-type-body-small-*` (`0.75rem`, weight `400`, line-height `1.2rem / 0.75rem = 1.6`) | `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`, `12px`, `line-height: 1.6` |
| Card corner radius | `--nc-radius-card` (`0.875rem`) | `14px` |
| Code box corner radius | `--nc-radius-button` (`0.5rem`) | `8px` |
| Borders | `--nc-border-width` | `1px` |
| Spacing (`--nc-space-3`, `4`, `5`, `6`) | `0.75rem`, `1rem`, `1.25rem`, `1.5rem` | `12px`, `16px`, `20px`, `24px` |

### Intentional Email-Specific Exceptions
Several properties in the email template intentionally differ from the web portal tokens for email readability and client compatibility:
1. **Email Container Width (`max-width: 520px`):** Standard narrow email card width instead of the web portal's `--nc-layout-content-max` (`68rem`), so the verification email reads comfortably inside desktop and mobile mail panes.
2. **Monospace Verification Code (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`, `28px`, `letter-spacing: 6px`):** Uses a monospace font stack and wide character tracking rather than `"Manrope"` so digits (especially `0`/`O` or `1`/`l`) are unmistakable when transcribing the 6-digit code.
3. **Table-Based Layout & `bgcolor` Attributes:** Uses `role="presentation"` HTML tables and `bgcolor` attributes instead of CSS Flexbox/Grid for legacy mail client compatibility.

---

## 2. Rendered Email Preview (`evidence/23-rendered-email.png`)

[`evidence/23-rendered-email.png`](file:///Users/blk/Developer/Five5%20assessment%20task/task-04-server-security/evidence/23-rendered-email.png) was captured using [`scripts/capture-step11-email.mjs`](file:///Users/blk/Developer/Five5%20assessment%20task/task-04-server-security/scripts/capture-step11-email.mjs) with a fictional account (`Ade Kolawole`) and a fictional, inactive verification code (`048291`). No email was sent to generate this preview. Earlier `line-height: 1.25` preview is preserved as [`evidence/23-rendered-email-v1-line-height-125.png`](file:///Users/blk/Developer/Five5%20assessment%20task/task-04-server-security/evidence/23-rendered-email-v1-line-height-125.png).

**Scope & Rendering Limitation:** This image is a **browser-rendered email preview** captured in headless Chromium. It confirms the resolved inline HTML structure and Task 1 token palette in a modern browser engine, **not** how third-party mail clients (such as Gmail web, Outlook desktop/Word engine, or Apple Mail) will render every CSS property such as `border-radius` or custom fonts.

---

## 3. Email Wording & Professional Copy Review Note

### Chosen Copy (HTML & Plain-Text)
- **Subject:** `Verify your email address — Nit's Cut`
- **Body:**
  > Hello [Name],
  >
  > Welcome to Nit's Cut. Confirm your email to finish setting up your account.
  >
  > Your verification code is [code].
  >
  > This code expires in 10 minutes and can only be used once.
  > If you didn’t create this account, you can ignore this email.

### Attribution & Real-Business Review Note
This wording was **AI-assisted and selected by the learner** for the assessment prototype. In a real business, customer-facing email wording should be reviewed and owned by a developer, copywriter, or marketer—not left solely to an AI draft—because transactional messages are part of the product's customer experience and marketing voice.

---

## 4. Personal Copy Critique

> “I would keep the selected wording unchanged for real customers. I have no wording changes to propose at this stage.”
