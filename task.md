Phase 1: The "Source of Truth" Alignment
Importance: CRITICAL | Speed: VERY FAST (⏱️ ~30 Mins)

Right now, your documentation is lying to your AI assistants (and to you). If you don't fix this, any AI you use will keep generating incompatible Next.js/Supabase code.

Task 1.1: Update OverHaul_Analysis.md & DESIGN_HANDOFF.md

Action: Search for every mention of "Next.js", "App Router", and "Supabase". Replace them with "Vite SPA", "React Router", and "Firebase Firestore/Auth".

Action: Delete any reference to manual Stripe webhooks. State clearly: "Monetization handled via Firebase Stripe Extension."

Phase 2: Bridging the Frontend to the Backend
Importance: CRITICAL | Speed: FAST (⏱️ ~1-2 Hours)

Your React UI has a "Dashboard" and a "Select Repo" flow that currently hit dead endpoints. We need to wire these up using the firebase-admin SDK so your frontend can actually fetch data.

Task 2.1: Build /api/github/repos.ts

Action: Create this serverless function. It needs to accept a GitHub token from your client, call the GitHub API (https://api.github.com/user/repos), and return the JSON list of repositories.

Why: This unblocks the core user journey of analyzing a repo.

Task 2.2: Build /api/user/readmes.ts

Action: Create this serverless function. It must verify the user's Firebase Auth token, query your Firestore readmes collection for documents matching that user's ID, and return them.

Why: This unblocks the User Dashboard UI.

Phase 3: The Monetization Shortcut
Importance: HIGH | Speed: MEDIUM (⏱️ ~2-3 Hours)

Since you are using Firebase, writing a manual webhook route for Stripe is a waste of time. We will let Google do the heavy lifting.

Task 3.1: Install the Stripe Firebase Extension

Action: Go to the Firebase Console -> Extensions. Search for "Run Payments with Stripe" and install it.

Action: Connect your Stripe API keys in the extension settings.

Task 3.2: Sync Products

Action: Click the "Sync" button in the extension. This automatically copies your Stripe subscription tiers (Free, Premium) into your Firestore database.

Task 3.3: Trigger Checkout from Frontend

Action: Update your frontend /pricing page. When a user clicks "Upgrade", simply write a new document to the customers/{userId}/checkout_sessions Firestore collection. The extension will automatically detect this, generate a Stripe Checkout URL, and update the document so your frontend can redirect the user.

Phase 4: Usage Tracking Persistence
Importance: MEDIUM | Speed: FAST (⏱️ ~1 Hour)

Your current V3 codebase uses Upstash Redis to track usage (rate limiting). Redis is incredibly fast, but it is volatile cache memory. If it clears, your users get their free credits reset.

Task 4.1: Update /api/generate.ts

Action: Right after your code successfully increments the Upstash Redis counter and generates the AI response, add an asynchronous call to the Firebase Admin SDK.

Action: Increment a totalGenerations integer field on the user's profile document in Firestore.

Why: This guarantees permanent data retention for your analytics and strict enforcement of the free tier.