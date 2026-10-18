# Checkmate Chess Club — Website project

This folder contains the complete front-end project:
- `index.html` — website structure and pages
- `styles.css` — responsive styling
- `app.js` — navigation, lessons, sample events, practice board, demo chat, and Supabase auth/profile logic
- `config.js` — place your Supabase Project URL and publishable key here
- `supabase-schema.sql` — database table, profile security policies, and profile-creation trigger

## Run it locally
1. Extract this ZIP into a folder.
2. Open the folder in VS Code.
3. Use the Live Server extension and open `index.html`.

## Connect accounts and profiles with Supabase
1. Create a Supabase project at https://supabase.com/dashboard
2. Open **SQL Editor** in your Supabase project.
3. Open `supabase-schema.sql`, copy all of it, paste it into SQL Editor, and click **Run**.
4. Open **Project Settings → API Keys**. Copy the Project URL and the **publishable** key (or legacy `anon` key if that's what your project displays).
5. Open `config.js` and replace the two `YOUR_...` placeholder values. Do not use a secret/service_role key.
6. In Supabase **Authentication → URL Configuration**, add your local URL while testing and your Firebase URL after deployment to the Site URL / Redirect URLs.

Email confirmation may be enabled by default. If so, users must confirm their email before they can sign in.

## Publish with Firebase Hosting
1. Install Node.js LTS from https://nodejs.org/
2. Open a terminal in this folder and run:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```
3. Select or create a Firebase project. When asked for the public directory, enter `.` because `index.html` is in the project root. Configure as a single-page app: **No** is fine for this multi-section site. If asked whether to overwrite `index.html`, answer **No**.
4. Deploy:
   ```bash
   firebase deploy --only hosting
   ```
5. Firebase prints the public `https://YOUR-PROJECT-ID.web.app` address. Anyone can open that address.
6. Add that deployed URL to Supabase Authentication → URL Configuration.

## Important: what is and is not live yet
- This is a complete, responsive multi-section front-end, and account/profile logic is prepared for Supabase.
- Until you configure Supabase, signup/signin intentionally shows a setup message.
- Events are sample data. The practice board is visual-only and does not validate legal moves.
- Demo chat is local to the browser; it is not shared between users.
- Real-time multiplayer chess, shared chat, event registration, verified tournament results, ratings, and moderation require backend work before launch. Do not advertise the current demo as a rated chess platform.


## Robot training mode
The Play & Train page includes a level selector and a browser-based chess opponent. The chess rules library is loaded from cdnjs, so robot training requires an internet connection. The robot uses simple level-based move selection (beginner/intermediate/advanced), not a grandmaster-strength engine.
