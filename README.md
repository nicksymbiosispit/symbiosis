# Symbiosis

A React messaging site with a deliberately nostalgic mid-2000s social-web visual style.

## What is included

- Email + password sign up/login
- Usernames
- One live `#lobby` room
- Private one-to-one direct messages
- Editable profiles with mood, location, and About Me
- Real-time messages using Supabase Realtime
- Old-web glossy buttons, blue underlined links, gradients, beveled panels, bright colors
- Mobile-friendly layout

## 1. Create the database

1. Create a project at Supabase.
2. Open **SQL Editor**.
3. Paste everything from `supabase.sql` and run it.
4. Make sure email/password authentication is enabled in Supabase Auth.
5. Copy your project URL and browser-safe publishable key from the Supabase project settings.

## 2. Add your keys

Open `src/config.js` and replace:

```js
export const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
export const SUPABASE_KEY = 'PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE';
```

with your project's values.

Use the browser-safe publishable/anon key only. Never put a Supabase `service_role` secret into this site.

## 3. Test locally

Install the dependencies and start Vite:

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## 4. Put it on GitHub

Create a new GitHub repository and push these files. A typical command sequence is:

```bash
git init
git add .
git commit -m "Create Symbiosis"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/symbiosis.git
git push -u origin main
```

## 5. Put it on Vercel

Import the GitHub repo into Vercel. Vercel should detect Vite automatically. The build command is `npm run build` and the output directory is `dist`.

## Important before a big public launch

This is a starter, not a finished social platform. Before a public release, add account-level rate limits, message pagination, stronger abuse prevention, backups, and a legal/privacy review.

## Moderator setup

After running the complete `supabase.sql`, promote the first trusted moderator in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'moderator'
where username = 'YOUR_USERNAME';
```

Moderators get a private report queue, message removal, and database-enforced lobby slow mode. Members can report messages or profiles and block other users. Blocking prevents new friend requests and direct messages in either direction.

Before launch, replace the Privacy page's operator/contact wording with your real operator identity, contact address, retention periods, and any disclosures required where you operate.
