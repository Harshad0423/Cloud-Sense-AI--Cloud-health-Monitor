# CloudSense AI — frontend delivery

The complete frontend has been redesigned and tested against the existing AWS APIs on 25 September 2026. The user authorized the available dark preview plus the written blue/black and light-theme requirements because the named v2 reference was missing.

## UI improvements

- Manrope 400/500, edge-to-edge application layout, rounded cards, blue branding, pill navigation and compact quick-navigation rail.
- Persistent dark and light themes on all eight pages, restored before stylesheet rendering.
- Separate pages for overview, files, website checks, recommendations, analytics, reports and settings; landing page retained with live health data.
- Real dashboard summaries, seven-day upload activity, SVG rings with round caps and current category distribution; no sample metrics.
- Detail drawers, keyboard focus containment/restoration, Escape dismissal, visible focus and reduced-motion support.
- Search, filter, sort and pagination retained; type filter now includes extensions present in the live file list.
- Loading/error/retry states, double-submission protection and disabled request controls. Settings remain disabled if their initial load fails.
- Sample data removed. Unsupported recommendation actions are explicitly disabled; unavailable notification/report server helpers no longer simulate success.
- Mobile tables scroll inside their cards. Long website URLs wrap or truncate within cards without overflowing the page.

## Preserved APIs

Base: `https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com`

| Method | Existing route |
|---|---|
| POST | `/upload-url` |
| GET | `/files` |
| DELETE | `/files/{fileId}` |
| GET | `/recommendations` |
| GET | `/dashboard-stats` |
| GET | `/settings` |
| PUT | `/settings` |
| GET | `/website-similarity` |
| POST | `/website-similarity` |
| DELETE | `/website-similarity/{scanId}` |

The original presigned S3 PUT upload is preserved. Request bodies, headers, route encoding, error parsing, and implicit backend user identity are unchanged. The only addition to file mapping is exposing the original `uploadedAt` value for date aggregation; existing mappings remain unchanged. All backend files match the backup byte for byte.

See `verification/API-INVENTORY.md` for payloads and response structures, and `verification/original-functions-selectors.txt` for the original function/selector/event inventory.

## Test checklist

Tests ran in headless Microsoft Edge against the live API, including real browser CORS behavior. The failed-network tests deliberately abort requests in the test browser only; production contains no substitute data.

| Check | Result |
|---|---|
| All eight pages load; live AWS GET requests return HTTP 200 | PASS |
| 1440, 1024, 768 and 375 px × both themes × eight pages (64 layout checks) | PASS |
| Long-URL website results at all four widths and both themes | PASS |
| Original API methods/contracts and backend source preservation | PASS |
| JavaScript syntax checks | PASS |
| Browser console on all eight pages: no errors | PASS |
| Dashboard renders live metrics and saved scan count | PASS |
| All detail drawers, focus containment, Escape and focus restoration | PASS |
| Theme toggle persists on refresh and another page | PASS |
| Pagination | PASS |
| Duplicate filter and duplicate review | PASS |
| Type filter | PASS |
| Size sorting | PASS |
| Global search and query prefilter | PASS |
| Filtered empty state | PASS |
| Presigned upload, S3 PUT, metadata refresh and real duplicate detection | PASS |
| Delete cancel, confirmed deletion, live API removal (test files only) | PASS |
| Recommendation priority filter, delete confirmation cancel and review navigation | PASS |
| Settings PUT with unchanged values and GET persistence after refresh | PASS |
| Live report generation and actual text download | PASS |
| Website URL swap | PASS |
| Live comparison request, verdict, all four scores, evidence, warnings and responsive results | PASS |
| History and compare-again URL restoration | PASS |
| Delete newly created website comparison | PASS |
| Friendly API failures across pages; settings protected against failed-load overwrite | PASS |
| Recovery after API failure | PASS |
| No uncaught browser JavaScript errors | PASS |
| Disposable test data cleanup | PASS |

Live test files used unique `cloudsense-ui-check-` names. Only those temporary files and newly created test scans were deleted. Existing storage and history records were preserved. Settings tests saved the existing preference values unchanged, so only the backend update timestamp may change. Reports downloaded actual current API data.

The initial expanded results-layout test found long-URL overflow. It was corrected and the final suite passed. Final machine-readable evidence is in `verification/browser-results.json`, `verification/live-flow-results.json`, `verification/contract-results.json`, and `verification/console-results.json`.

## Files changed

### Modified

- `README.md`
- `frontend/analytics.html`
- `frontend/css/responsive.css`
- `frontend/css/style.css`
- `frontend/dashboard.html`
- `frontend/files.html`
- `frontend/index.html`
- `frontend/js/analytics.js`
- `frontend/js/app.js`
- `frontend/js/dashboard.js`
- `frontend/js/files.js`
- `frontend/js/recommendations.js`
- `frontend/js/reports.js`
- `frontend/js/settings.js`
- `frontend/js/website-similarity.js`
- `frontend/recommendations.html`
- `frontend/reports.html`
- `frontend/settings.html`
- `frontend/website-similarity.html`

### Added frontend files

- `frontend/css/theme.css`
- `frontend/js/landing.js`
- `frontend/js/theme.js`
- `frontend/js/ui.js`

### Removed sample file

- `frontend/js/mockData.js`

Additional delivery artifacts: this document, the API inventory, test scripts/results, and selected screenshots. `deliverables/original-project.zip` preserves the entire starting project in the workspace.

## Remaining limitations

- The exact approved v2 reference was unavailable. The replacement reference and written requirements were used with user approval.
- Email delivery and server-side report generation have no active frontend endpoint. Current report refresh/download and settings preferences are retained; email success is not simulated.
- Activity is derived from upload timestamps of files that still exist, not a historical storage log. Scan count reflects returned saved comparisons, not an undocumented lifetime total.
- The deployed API supports scan history, but the bundled website Lambda source predates GET/DELETE history routes. It was left unchanged and must not be redeployed as a replacement for the live service based on this frontend delivery.
- Manrope loads from Google Fonts with a system-font fallback when offline. AWS must remain accessible and allow the deployment origin through its existing CORS configuration.
- Verification used Edge. Other browser engines were not tested. Reduced-motion styling is implemented; a full external accessibility audit was not performed.

## Run and package

No build step is needed. Serve `frontend/` with any static server, or open `frontend/index.html`. The final ZIP contains the frontend, README, delivery notes and verification evidence. It does not change or deploy the backend.

## Full-page layout update — 26 September 2026

Removed the application shell width cap, outer margins, outer border, rounded outer corners and frame shadow. The shared app layout now fills the browser width and at least the viewport height on desktop, tablet and mobile. Inner cards and content padding remain intact. Changed `frontend/css/theme.css` only; API code is unchanged.

Dashboard, Files and Website Check passed 30 layout checks across 1920, 1440, 1024, 768 and 375 px in both themes, with no horizontal page overflow or uncaught JavaScript errors. Live GET requests returned HTTP 200. Evidence: `verification/full-page-results.json`.
