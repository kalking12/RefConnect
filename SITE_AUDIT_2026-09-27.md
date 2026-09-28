# RefConnect quality audit — 27 September 2026

**Historical audit:** This scorecard describes the previous signed-out-first interface. The 28 September frontend update replaces the first screen with a public introduction, a public procedure finder, an About/team section, and a 4.5-second welcome. Protected hospital results, referrals, and administration still require verified Google sign-in. See `README.md` for the current flow; the scores below have not been rerun against a deployed site or Android package.

This audit covers the source and a locally built production server. Scores are out of five: **4** means the checked implementation is good with limited remaining verification; **3** means a material gap remains; **2** means the requested setting has not been exercised. Source inspection, automated tests, and HTTP smoke checks cannot prove the deployed Google login, real hospital data, physical mobile experience, or an APK.

| Criterion | Score | Evidence and remaining limit |
| --- | ---: | --- |
| Generic layouts that make pages look alike | **4** | The signed-out preview, procedure finder, and administrator editor have distinct layouts and clear purposes. Rendered device review remains. |
| 1. Colours, spacing, fonts, buttons | **4** | Shared palette, type, controls, and focus treatments; corrected contrast tokens and inconsistent fallback controls. |
| 2. Duplicate buttons/actions | **4** | Removed repeated portal calls to action, redundant links, and a fake preview search. |
| 3. Navigation and page names | **4** | “Find a hospital” and administrator labels align with destinations; mobile admin navigation has a clear open/close action. |
| 4. First screen/main feature | **4** | A short welcome gives way to procedure search; signed-out visitors see an inert preview of that actual workflow behind the Google sign-in prompt. |
| 5. Mobile overflow/tap targets | **4** | Main controls and dialog close target are at least 44 px; comparison tables scroll in a labeled region and forms fit narrow widths. Physical device review remains. |
| 6. Contrast/readability | **4** | Corrected measured failures; 25 sampled colour pairs pass and key form text is readable. This is not a full rendered contrast audit. |
| 7. Labels/keyboard support | **4** | Inputs and selectors have labels, focus states and error focus; welcome focus moves into content, tables use table semantics. Manual screen-reader testing remains. |
| 8. Apparent dead buttons | **4** | Signed-out preview is visibly informational and inert; visible controls have real handlers or destinations. |
| 9. Links/routes | **4** | Internal anchors and direct /admin route work in the local production server; missing API/static paths return 404. External contact ownership and live links need verification. |
| 10. Placeholders/sample data | **3** | Five active facilities have **illustrative** capability values, inactive directory entries remain, and the shared referral profile is a demo. Missing scores display “unavailable,” not a misleading 0%. These records are clearly labeled, but verified replacements and a real profile workflow are still needed. |
| 11. Repetitive/unclear copy | **4** | Shortened sign-in, referral, and administrator instructions; status copy describes the next action. |
| 12. Form validation/errors | **4** | Admin fields trim and validate in UI and server, invalid fields get clear errors and focus; sign-in/save failures give recovery guidance. |
| 13. Loading/empty/failure states | **4** | Session, hospital, profile, account, and admin flows expose loading, empty, retry, and save-failure states while preserving drafts. Offline queries no longer show a false empty result. |
| 14. Asset weight/unused code | **4** | Removed unused photos/styles and lazy-loaded the doctor/admin routes. The 1254 px hero transfers as a 147,736-byte WebP in supporting browsers (91.2% below PNG), with PNG fallback; the mark has a lossless WebP fallback pair. The main JS remains substantial and real-network timing has not been measured. |
| 15. Poor connection | **3** | Offline session checks pause and resume with a reconnect panel; authenticated users see a clear banner. Read-only queries retry once and time out after 90 seconds. Writes do not automatically retry because a lost response can hide a successful save; the referral form warns about uncertain outcomes and blocks repeating the same handoff during that page session. Cold offline use and write reconciliation remain unsupported. |
| 16. Login/access enforcement | **4** | The public preview mounts no protected data hooks. Server procedures require verified Google sessions, administrator edits require an admin role, owner-only role changes are enforced on the server, and API POSTs require the exact site origin. Live OAuth setup still needs testing. |
| 17. Frontend secrets | **4** | Source exposes only the public Google Web client ID; database and session secrets are server environment variables. Live hosting settings were unavailable to inspect. |
| 18. Data/privacy handling | **4 for the demo** | Profiles are owner scoped; activity logging omits patient details; new referral rows no longer duplicate name/reference/condition in a legacy snapshot column; real profiles cannot target illustrative hospitals. Existing snapshots and any real-patient launch still need an agreed retention, deletion, access, and clinical approval workflow. |
| 19. Production/APK behavior | **2 overall** | The web source builds, serves direct routes, handles missing paths, and passes local production smoke checks (**4 for web source**). No Render/Aiven deployment or Android project/package was supplied for end-to-end OAuth, database migration, and device verification. |

## What prevents a verified 4/5 on every relevant criterion

1. **Real data (#10):** confirm or replace the illustrative hospital capability values, validate contact details and facility names against an approved source, and specify how real patient profiles are created. The server intentionally rejects real-profile referrals to illustrative destinations.
2. **Connection recovery (#15):** decide whether users need offline viewing/saving and design a server-backed referral history/idempotency workflow for ambiguous writes. Caching patient data offline or retrying a potentially committed write without that workflow would be unsafe.
3. **Deployment/APK (#19):** provide the deployed HTTPS URL, Render/Aiven configuration access or test results, and the Android wrapper/package if one exists. Google sign-in must be exercised in a supported Android browser context, not assumed from a Vite build. Source-level web readiness is 4/5, but the deployment/device claim is unverified.
4. **Real-patient privacy:** agree retention, access, and deletion rules before using actual patient records. Older rows may contain profile snapshots; this source change does not erase them.

## Verification performed

- pnpm check, pnpm test (**59 tests**), and pnpm build passed.
- Local production smoke checked /healthz, direct /admin, current hashed assets and WebP/fallback image routes, missing-path 404s, anonymous /images denial, and originless API POST denial.
- A localhost browser visual session was attempted but the available browser blocked the local address. A physical phone, screen-reader session, live Google/Aiven login, and APK were not available; the mobile/accessibility scores are source-based.

Before connecting an existing database, apply drizzle/0008_superb_anthem.sql and follow DEPLOY_RENDER_AIVEN.md. The archive keeps the Manus-derived app structure and demonstration mode. No live hosting settings or credentials are included.
