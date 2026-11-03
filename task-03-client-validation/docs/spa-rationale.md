# Single Page Architecture Rationale

Task 3, Step 1: Collapsing signup, login, and password reset into `/auth`.

---

## 1. What the separate-page version felt like

In our baseline test, signup, login, and password reset lived at three separate web addresses (`/signup`, `/login`, and `/reset`).

Using that version felt slow and clunky:
- **Full page reloads:** Every time you clicked a link to change forms—like clicking *"Forgot your password?"* while trying to log in—the browser discarded the entire page, showed a brief blank flash, sent a new HTTP request over the network, and waited for the server to reply.
- **Lost information:** If a user typed their email address on the login page and then realized they needed to reset their password, moving to the reset page wiped out everything they had typed.
- **Unnecessary network traffic:** The browser had to reload the same layout, header, navigation, and footer three separate times just to show a different pair of text boxes.
- **Broken rhythm:** For a customer who simply clicked the wrong button, waiting for a round-trip network response interrupts what should be an instantaneous decision.

---

## 2. What improved after the collapse

By collapsing the three forms into a single page at `/auth` and switching them using `?mode=login`, `?mode=signup`, and `?mode=reset`, the experience improved in several ways:

1. **Instant switching with zero waiting:**
   Switching between log in, sign up, and password reset happens instantly in the browser. Because all three form structures are already loaded in the HTML, switching them takes 0 milliseconds of network time and makes 0 requests to the server.
2. **Clean URLs and full browser support:**
   The browser address bar still updates cleanly (e.g. `/auth?mode=signup`). The Back and Forward buttons work exactly as expected, and users can copy or bookmark a direct link to any of the three states.
3. **Works without JavaScript (Progressive Enhancement):**
   If JavaScript is disabled or fails to load, the switcher buttons act as standard HTML links. The server reads `req.query.mode` and renders the requested form directly.
4. **Accessible focus management:**
   When a user clicks to switch forms, the client script moves focus directly to the new form's main heading (`<h1 tabindex="-1">`). This ensures screen reader users are immediately told that the view changed, rather than being left stranded at the bottom of the page.

---

## 3. When separate pages would be the better choice

Single page architecture is not universally better. There are real situations where separate pages are the superior architectural decision:

### Federated Authentication and Strict Security Boundaries (SSO / OAuth)
If authentication involves external identity providers (such as Google Workspace, GitHub, SAML, or enterprise SSO like Okta), the user must be redirected away from your application to the identity provider's secure domain anyway. Trying to force that flow into an in-page modal or single-page switcher creates brittle iframe workarounds, security warnings, and cross-origin complexity.

Furthermore, when authentication requires strict security isolation, separate pages allow you to apply different security policies to different actions:
- **Strict Content Security Policies (CSP):** A password reset or two-factor recovery page can enforce a locked-down CSP that forbids all external scripts and inline handlers, whereas marketing or signup pages might require third-party analytics or bot detection (e.g., CAPTCHA).
- **Subdomain and memory isolation:** Banking or healthcare applications often isolate login and credential resets onto dedicated subdomains (e.g., `auth.example.com` vs `app.example.com`). This ensures that malicious client-side scripts, browser extensions, or memory leaks on standard application pages cannot inspect memory or DOM nodes containing sensitive credentials.
- **Targeted rate limiting and infrastructure:** Password reset endpoints are frequent targets for automated credential stuffing and email bombing. Having a distinct route (`/reset-password`) allows reverse proxies (like Cloudflare or Nginx) to apply strict IP throttling and bot protection directly at the edge, without adding complexity to general application routes.
