# RefConnect frontend update — 28 September 2026

## Page flow

1. The first public visit shows a 4.5-second, skippable welcome that draws the brand and fades into the introduction. Reduced-motion visitors bypass it.
2. The public page introduces RefConnect, then lets visitors filter and explicitly choose a procedure. Selecting **View hospitals** opens /search?procedure=... and requests Google sign-in if needed. The selected procedure survives the sign-in reload.
3. After sign-in, the existing protected workspace ranks hospitals, shows their readiness percentages, supports comparison, and prepares a referral. The public page continues to About/team and a RefConnect footer. Visiting /admin requests sign-in and still requires an administrator role on the server.

The public page makes no hospital, patient-profile, or referral API request. Server access checks for those records and owner-managed administrator roles were preserved.

## Content and images

The public introduction and five co-founder names come from the supplied pitch deck. Team portraits were matched to their names in the supplied image document. The public page uses three optimized clinical WebP images: two alternate slowly in the hero, and one stays in About. Images showing identifiable patients and the named hospital sign were not included. The selected images and portraits require publication-rights confirmation before public deployment.

The pitch deck does not provide verified hospital capability values or identify the five proposed government pilot hospitals. The existing five active seed hospitals retain different **illustrative** capabilities. For example, the generated CABG readiness scores are AKTH 97%, MMSH 75%, PAM 58%, KMC 34%, and DNOH 77%. These are demonstration calculations, not clinical availability or verified recommendations. The server continues to prevent a real patient profile from targeting an illustrative destination.

## Deployment and verification

The supplied scripts/migrate.mjs is retained. render.yaml now runs pnpm db:migrate:verbose before the production build, matching the migration path the user reports works with Render and Aiven. No live environment credentials or deployment were changed.

TypeScript checking, 59 automated tests, and the production build pass. Local HTTP smoke checked /, /search, and /admin direct routes; public WebP assets; 401 for anonymous hospital data and private images; and 403 for an originless API POST. A rendered phone/browser review and live Google/Render/Aiven verification remain outstanding.

The cleaned source archive excludes the uploaded .env.local, Git history, node_modules, and build output. If the uploaded environment file contained active credentials, rotate them before sharing the original ZIP further.
