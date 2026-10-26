Run from the repository root with Node and Playwright/Chrome installed:

```sh
node public/p/explorer/qa/static-check.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node public/p/explorer/qa/colour-audit.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node public/p/explorer/qa/e2e.mjs
```

Each browser script starts and stops its own Python HTTP server on 127.0.0.1:5303,
serving only public/p/explorer. Run them sequentially. Set BASE_URL to use an
existing standalone server; do not point it at the shell. CHROME_CHANNEL defaults
to chrome. No dependencies are added to the application.

Results are in qa/results. Colour audit captures full-page screenshots for every
listed route at 1440/390 in both themes, plus available dialogs, preview/peek,
filters, dropdowns and follow toasts. It reports all visible text below 4.5:1,
including large text; disabled text is separately marked. It composites alpha
colours and inherited opacity. Gradients, images, pseudo-elements and sibling
occlusion still require visual review; this is not an exhaustive WCAG certification.

E2E records route timings, network resources, long tasks, console/page errors,
failed/slow requests, link inventory and button inventory. It operates enabled
visible buttons in their original route context, checks pager state/height, and
recursively visits unique collected destinations including external docs/social.
Copy, download-action and form-submit buttons are inventoried but not fired;
explicit download links are requested and checked for nonempty successful bodies.
Hidden buttons are inventoried; links are collected even inside hidden faces.
A slow/unreachable external site fails the run instead of being silently ignored.

On a pre-change checkout use e2e.mjs --baseline and preserve e2e-before.json before
running the after suite; the latter reports matched before/after timings. No
baseline timings could be captured in this restricted execution environment.
Both browser scripts currently record a blocked result because the sandbox denies
server port binding. Direct Chrome launch also fails. Browser assertions,
screenshots and computed-style results have not been verified here.
