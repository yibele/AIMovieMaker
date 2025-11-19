# Supabase Setup Guide for Google Login

Follow these steps to configure Supabase for Google Authentication in your project.

## 1. Create a Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Choose your organization, enter a name (e.g., `AIMovieMaker`), set a database password, and choose a region.
4. Click **"Create new project"**.

## 2. Get API Keys
1. Once the project is created, go to **Project Settings** (cog icon) -> **API**.
2. Find the `Project URL` and `anon` `public` key.
3. Create a file named `.env.local` in the root of your project (if it doesn't exist) and add these keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Configure Google OAuth
1. Go to **Authentication** -> **Providers** in the Supabase sidebar.
2. Find **Google** and click to expand it.
3. You need a **Client ID** and **Client Secret** from Google.
4. Go to the [Google Cloud Console](https://console.cloud.google.com/).
5. Create a new project or select an existing one.
6. Search for **"APIs & Services"** -> **Credentials**.
7. Click **"Create Credentials"** -> **"OAuth client ID"**.
8. If prompted, configure the **OAuth consent screen** first (User Type: External, fill in app name and email).
9. For Application type, choose **"Web application"**.
10. Under **"Authorized redirect URIs"**, you must add the callback URL from Supabase.
    - Go back to Supabase -> Authentication -> Providers -> Google.
    - Copy the **"Callback URL (for OAuth)"** (it looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
    - Paste this into the Google Cloud Console's "Authorized redirect URIs".
11. Click **"Create"**.
12. Copy the **Client ID** and **Client Secret**.
13. Go back to Supabase and paste them into the Google provider settings.
14. Ensure **"Enable Sign in with Google"** is checked.
15. Click **"Save"**.

## 4. Configure Site URL
1. In Supabase, go to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` (for local development).
3. If you deploy, add your production URL to **Redirect URLs**.

## 5. Test Login
1. Restart your Next.js server (`npm run dev`) to load the new environment variables.
2. Open the app, click "Log In", and select "Continue with Google".
3. It should redirect you to Google, and upon success, redirect back to your app.

## 6. Production Deployment Setup
You don't need to change your code! `window.location.origin` automatically detects if you are on localhost or production. However, you must whitelist your production URL.

### In Supabase Dashboard:
1. Go to **Authentication** -> **URL Configuration**.
2. In **Redirect URLs**, click **"Add URL"**.
3. Add your production URL (e.g., `https://your-app.vercel.app` or `https://aimoviemaker.com`).
4. **Important**: You should have both `http://localhost:3000` AND your production URL listed here.

### In Google Cloud Console:
1. Go to **APIs & Services** -> **Credentials**.
2. Edit your **OAuth 2.0 Client ID**.
3. Under **"Authorized redirect URIs"**, add the production callback URL.
   - It is usually the same Supabase Callback URL as before: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - **Wait!** Actually, for Supabase + Google, the "Authorized redirect URI" in Google Console **STAYS THE SAME** (it always points to Supabase).
   - **You ONLY need to update the "Authorized JavaScript origins"** in Google Console if you are using the Google Sign-In button directly, but since we are using Supabase's handler, **you usually don't need to change anything in Google Cloud Console** for the redirect to work, provided the Supabase Callback URL hasn't changed.
   - *Correction*: The Google Cloud Console only cares that the user is returned to *Supabase*. Supabase then redirects the user to *your app*.
   - **So, the only thing you strictly need to do is Step 1 (Supabase Dashboard).**

### Summary
- **Code**: No changes needed (`window.location.origin` works automatically).
- **Supabase**: Add production URL to "Redirect URLs".
- **Google**: No changes needed (as long as Supabase Callback URL is already there).
