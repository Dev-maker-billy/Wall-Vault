# Wall Vault

A wallpaper site that costs $0 to run. Visitors pick a wallpaper and a screen size, and the image is cropped and resized in their own browser before it downloads.

- **Frontend:** Next.js (App Router) and Tailwind CSS, hosted on Vercel Hobby
- **Database and storage:** Supabase free plan (Postgres plus a public storage bucket)
- **Image processing:** HTML5 canvas in the browser only. No serverless image code, so nothing counts against Vercel runtime limits.

## How it works

| Part | Where |
| --- | --- |
| Gallery with tag pills | `src/app/page.tsx`, `src/components/Gallery.tsx` |
| Download modal with live crop preview | `src/components/DownloadModal.tsx` |
| Center-crop and scale logic | `src/lib/resize.ts` |
| Admin upload page at `/admin` | `src/app/admin/page.tsx` |
| Database and storage setup | `supabase/schema.sql` (new projects), `supabase/protect-originals.sql` (existing ones) |
| One-minute download links | `src/app/api/original/route.ts` |

When you upload, the browser also makes a small preview image (900 px on the long side). The gallery loads only previews. The full original is fetched only when someone presses Download. This keeps you well inside Supabase's free 5 GB monthly egress.

## Setup checklist

### 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project (free plan).
2. Open **Authentication > Users > Add user > Create new user**. Enter your email and a strong password, and tick **Auto Confirm User**. This is your admin login.
3. Open **Authentication > Sign In / Providers** (the exact label varies) and turn **off** "Allow new users to sign up". Nobody else needs an account.
4. Open `supabase/schema.sql`, replace `REPLACE_WITH_YOUR_EMAIL` with the admin email from step 2, and paste the whole file into **SQL Editor > New query**. Press **Run**. This creates the table, the `wallpapers` bucket, and the security rules. Only your email can upload or delete; everyone can view.
5. Open **Project Settings > API** and copy the **Project URL** and the **anon public** key (newer dashboards may call it the publishable key).

### 2. Connect GitHub to Vercel (auto-deploy)

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
2. Press **Add New > Project**. Under **Import Git Repository**, press **Adjust GitHub App Permissions** if `Wall-Vault` isn't listed, grant access to this repo, then press **Import**.
3. Leave the framework preset as **Next.js**. Leave build and output settings at their defaults.
4. Expand **Environment Variables** and add both, for all environments (Production, Preview, Development):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your **service_role** key (Project Settings > API). Secret: server only, never share it or add `NEXT_PUBLIC_` to its name. |

5. Press **Deploy**.
6. Check **Settings > Git** in the Vercel project: **Production Branch** should be `main`.

From now on, every push to `main` builds and goes live automatically. Pushes to other branches get their own preview URL.

If you add or change an environment variable later, Vercel only applies it to new deployments. Press **Deployments > ... > Redeploy** to pick it up.

### 3. Add wallpapers

1. Go to `https://your-site.vercel.app/admin` and sign in.
2. Enter a title, comma-separated tags, and choose an image (JPG, PNG or WebP, up to 50 MB).
3. New wallpapers show up on the homepage within a minute. The page refreshes its data at most once every 60 seconds.

The admin page isn't linked anywhere and is marked `noindex`, but the real protection is the login and the database rules.

## Protecting the full-size images

Nothing on a website can fully stop someone saving an image they can see: screenshots and browser developer tools always work. What Wall Vault does is make the real file hard to reach.

- **Originals are private.** Full-size files live in a private Supabase bucket called `originals`. Nobody can open them by address. The gallery only loads small previews.
- **Download links expire.** When someone presses Download, the site (`/api/original`) creates a link that works for one minute and only answers requests that come from this site's own pages. Pasting an image address into another website, or opening it in a new tab, gets nothing.
- **Hidden file locations.** Visitors can't read where an original is stored.
- **No casual saving.** Right-click, dragging an image out, and long-press "save image" are switched off on the homepage.

### Turning it on for an existing site

1. In Supabase, open **SQL Editor**, paste the whole of `supabase/protect-originals.sql`, and press **Run**. (A brand-new project can use `schema.sql` instead, which already includes this.)
2. In Vercel, add the `SUPABASE_SERVICE_ROLE_KEY` variable (see step 2.4 above), then redeploy.
3. Open `/admin`. If older wallpapers still have a public original, a banner offers **Make all private**. Press it once.

## Local development

```bash
cp .env.example .env.local   # then fill in the two values
npm install
npm run dev
```

## Free-tier limits to keep in mind

- **Supabase free:** 500 MB database, 1 GB file storage, 5 GB egress per month, 50 MB per file. Free projects pause after a week with no activity; press Restore in the dashboard to wake one.
- **Vercel Hobby:** personal, non-commercial use. 100 GB bandwidth per month.
- **Output size:** custom sizes are capped at 8192 px per side and 16 megapixels, which is what mobile browsers can safely render.
