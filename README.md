# CloudSense AI

Framework-free HTML, CSS and JavaScript frontend connected to the existing AWS API. Open `frontend/index.html` or serve `frontend/` with any static server (for example `python -m http.server 5500 --directory frontend`). No build or dependency installation is required to run the site.

## Pages

- Overview: live cloud health, storage, duplicates, saved scan count, seven-day upload activity, category breakdown and recommendation summary.
- Files: search, dynamic file-type/status filters, size/name sorting, pagination, upload progress, duplicate review and confirmed deletion.
- Website Check: URL swap, four independent similarity scores, duplication verdict, evidence, warnings and saved-comparison actions.
- Recommendations: priority filters, real savings and supported review/deletion actions.
- Analytics: health calculation, category usage, current file health, upload activity and detail drawers.
- Reports: current AWS snapshot and downloadable text report.
- Settings: AWS-backed name, email, analysis frequency and notification preferences.

Both themes use Manrope 400/500 with system fallback. The selected theme is stored in `cloudsense-theme`. SVG rings, keyboard-operable dialogs, focus restoration, reduced-motion support and API failure/retry states are shared across the application.

## Integration preservation

Base URL: `https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com`

| Method | Route |
|---|---|
| POST | /upload-url |
| GET | /files |
| DELETE | /files/{fileId} |
| GET | /recommendations |
| GET | /dashboard-stats |
| GET, PUT | /settings |
| GET, POST | /website-similarity |
| DELETE | /website-similarity/{scanId} |

Uploads also PUT the file binary to the original returned presigned S3 URL. Existing request headers, bodies, encoded route parameters and user-ID behavior are unchanged. `getFiles` additionally exposes the original `uploadedAt` timestamp for chart aggregation; all original display mappings remain intact. Backend sources are unchanged.

Detailed contracts and the original selector/function index are in `verification/`. The original project is backed up in `deliverables/original-project.zip`.

## Verification and limits

See `DELIVERY.md` and the JSON results in `verification/` for the test checklist. Automated browser checks use Playwright and Microsoft Edge. Live write tests create uniquely named temporary files and comparisons, then remove only those records. Settings verification saves existing values unchanged.

- Reports are current snapshots, not historical weekly reports. Email delivery and server-side report generation are unavailable in the existing frontend integration; neither is simulated.
- Activity charts aggregate currently stored files by upload date over seven local-calendar days. They do not reconstruct deleted files or historical storage totals.
- Website scan count describes records returned by the history API, not an undocumented lifetime total.
- The deployed API supports history GET/DELETE, but the bundled website Lambda source predates those routes. It was preserved, not redeployed.
- The approved v2 preview was unavailable; the user approved the available preview plus the written blue/black and light-theme requirements.
