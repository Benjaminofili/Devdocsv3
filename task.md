Phase 1: The "Source of Truth" Alignment
Status: [x] DONE

Phase 2: Bridging the Frontend to the Backend
Importance: CRITICAL | Speed: FAST (⏱️ ~1-2 Hours)

Your React UI has a "Dashboard" and a "Select Repo" flow. We need to wire these up using the firebase-admin SDK so your frontend can actually fetch data.

Task 2.1: Build /api/github/repos.ts
Status: [x] DONE

Task 2.2: Build /api/readmes/get.ts (or similar)
Status: [x] DONE
Action: Create this serverless function. It must verify the user's Firebase Auth token, query your Firestore `readmes` collection for documents matching that user's ID, and return them.
Why: This unblocks the User Dashboard UI so users can view their saved documentation.

Phase 3: Subscription & Monetization (Paystack Pivot)
Importance: HIGH | Speed: MEDIUM (⏱️ ~2-3 Hours)

We have pivoted from Stripe to Paystack. We need to ensure the Paystack integration is fully wired up to handle premium upgrades and webhook validations.

Task 3.1: Finalize Paystack Webhooks
Status: [ ] PENDING
Action: Ensure `/api/paystack/webhook.ts` correctly verifies Paystack signatures and updates the user's `tier` in Firestore to "premium".

Task 3.2: Connect Frontend Upgrade Flow
Status: [ ] PENDING
Action: Ensure the frontend pricing page triggers `/api/paystack/initialize` and redirects the user to the Paystack checkout.

Phase 4: Usage Tracking Persistence
Status: [x] DONE