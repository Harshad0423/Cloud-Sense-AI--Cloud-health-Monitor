# CloudSense frontend inventory (before redesign)

The workspace is newer than the supplied ZIP; its website-history and live-report code is the baseline. Original project: `deliverables/original-project.zip`. Backend files must remain byte-identical.

Base URL: `https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com`

| Function | Method and route | Request / response contract |
|---|---|---|
| getFiles | GET /files | Accept: application/json; `{files:[]}`; maps fileId/fileKey/fileName, fileSize, uploadedAt, status, duplicateOf into display fields |
| uploadFile | POST /upload-url | Content-Type: application/json; `{fileName,contentType}` → `{uploadUrl,fileKey}`; XMLHttpRequest PUT of original binary to returned S3 URL, same Content-Type; upload progress events |
| deleteFile | DELETE /files/{encoded fileId} | Accept: application/json; parses optional JSON; message on failure |
| getRecommendations | GET /recommendations | Accept: application/json; `{recommendations:[]}`; retains fields, normalizes id/priority and derives priorityLabel/problem |
| getDashboardStats | GET /dashboard-stats | Accept: application/json; requires `{health,storage,summary}`; score/max/label/subtitle, usedBytes/formattedUsed/totalGB/breakdown, totalFiles/healthy/duplicates/inactive/large/potentialSavings |
| getSettings | GET /settings | Accept: application/json; `{settings:{name,email,analysisFrequency,emailReports,duplicateAlerts,storageWarnings}}` mapped to account/notifications form |
| saveSettings | PUT /settings | Accept and Content-Type: application/json; exact flat body `{name,email,analysisFrequency,emailReports,duplicateAlerts,storageWarnings}`; optional response JSON/message |
| compareWebsites | POST /website-similarity | Accept and Content-Type: application/json; `{urlA,urlB}`; requires scores/verdict, renders websites/evidence/warnings |
| getWebsiteScans | GET /website-similarity | Accept: application/json; `{scans:[]}`; scanId, analyzedAt, duplicationScore, verdictLevel/Label, titleA/B, urlA/B |
| deleteWebsiteScan | DELETE /website-similarity/{encoded scanId} | Accept: application/json; optional response JSON/message |

No explicit user IDs, credentials options, authentication headers, URL query parameters, or localStorage/sessionStorage keys in existing API code. File navigation uses `?q=`. No active report or notification endpoint: reports.js uses live stats/recommendations and Blob download. Unused simulated generateReport/getNotifications helpers exist in app.js.

Pages: index (landing); dashboard (metrics, health, storage, recommendation preview); files (search/type/status/sort, six-item pagination, S3 upload, duplicate review, deletion); website-similarity (swap, submit, verdict/four scores/evidence/warnings, history/compare-again/delete); recommendations (priority filter, review/delete); analytics (score rules, category/health charts); reports (fresh snapshot and text download); settings (load/save account/frequency/toggles).

Shared app.js owns shell, mobile navigation, search, notifications, toasts, modal and confirmation. The complete function, DOM selector, and event listener index is in `original-functions-selectors.txt`. Existing IDs are retained. Theme persistence will use a new `cloudsense-theme` key.

Baseline issues: dashboard/analytics lack rejection handling; failed file/recommendation requests appear empty; settings substitutes a sample account on failure; notifications are samples; dashboard recommendation buttons have no handler. The bundled website Lambda implements only comparison/OPTIONS, whereas the newer frontend calls history GET/DELETE; deployed compatibility must be tested, not corrected by editing Lambda.

Visual reference: approved v2 attachment unavailable. User authorized the available `cloudsense-dark-preview.html` plus written blue/black and light-theme requirements.
