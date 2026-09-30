# RefConnect update — 29 September 2026

The changes in `sol 3.docx` were applied to the previous RefConnect v2 source. The accompanying `edusense-rebuild_3.zip` is a separate EduSense project and was left untouched.

## User experience

- The landing uses a blue `#269feb` palette with cream, navy, and gold accents. Its hero rotates through five optimized images in approximately five-second intervals and remains static when reduced motion is requested.
- The About section shows only the two named founders, Khalid Osinusi and Morayo Akinbile, in large cards.
- The public procedure finder carries the selected procedure to `/search?procedure=...`. After sign-in, matching hospital results appear immediately and the full picker opens only through **Change procedure**. A direct visit without a valid procedure shows an explicit choice prompt.
- A fixed comparison pill keeps the selected count and **Review** action visible while scrolling. All hospital cards use the same **Prepare referral** action; the dialog explains data and profile restrictions.
- An empty profile list gives an action to request profile setup without collecting patient details. Uncertain referral saves show **Try again**, with administrator guidance after repeated failures.

## Referral retry safety

The browser generates one UUID per profile, destination, procedure, and signed-in user attempt and retains it in tab session storage until the save is confirmed. The server derives a user-scoped referral ID, checks whether the record was already committed, and treats a concurrent duplicate insert as a no-op. Reusing an attempt for a different selection is rejected. There is no new database migration. This protects a manual retry after a lost response; it does not send a referral to a hospital.

## Assets and release notes

The logo and mark were regenerated in blue; the current clinical photographs were edited so visible scrubs are blue, and a new care-team hero was generated. WebP assets are optimized for the site. Three unused team portraits were removed. The source images of actual people remain subject to the publication-rights check described in `README.md`.

TypeScript checking, 62 automated tests, and the production build pass. Local production HTTP checks returned the public routes and images, denied anonymous hospital data and private images with 401, and denied an originless API write with 403. Browser rendering from this workspace and live MySQL/Google sign-in were not available, so the appearance and database retry race still need staging verification.

The archive does not include runtime credentials, dependencies, or build output. Run `pnpm install`, then `pnpm check`, `pnpm test`, and `pnpm build`; see `DEPLOY_RENDER_AIVEN.md` for deployment. No live Render, Aiven, Google OAuth, or Android environment was changed in this update.
