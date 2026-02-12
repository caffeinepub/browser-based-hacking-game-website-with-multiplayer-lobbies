# Specification

## Summary
**Goal:** Enable Google Search Console ownership verification via an HTML file served from the site root.

**Planned changes:**
- Add a static file at the frontend public/root output named `google79d2180f87c8c2c7.html`.
- Ensure the file contents are exactly `google-site-verification: google79d2180f87c8c2c7.html` and that it is served as a static asset (not handled by SPA routing).

**User-visible outcome:** Visiting `https://<site-domain>/google79d2180f87c8c2c7.html` returns the verification string with an HTTP 200 response, allowing Google Search Console to verify site ownership.
