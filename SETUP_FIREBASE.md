# Firebase setup and feature implementation

This source package is configured for Firebase project `maintenance-system-7ab2f` using its public web configuration. **No live deployment or end-to-end Firebase test was performed.**

## 1. Create Firebase project
- Firebase project already selected: `maintenance-system-7ab2f`.
- Enable Authentication > Email/Password.
- Create a Firestore database.
- Web App config has already been populated in `.env` (public Firebase web identifiers).
- Install Firebase CLI (`npm install -g firebase-tools`) and sign in (`firebase login`).
- The `.firebaserc` already selects `maintenance-system-7ab2f`. Verify your Firebase CLI account has access before deploying.

## 2. Install and deploy
```bash
npm install
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,functions
npm run dev
```
Optional hosting: `npm run build && firebase deploy --only hosting`.

## 3. Provision the first admin
Use a secure local environment with Google Application Default Credentials (`gcloud auth application-default login`) and your Firebase project selected. Never put admin credentials in the frontend or commit them to source control.
```bash
cd functions
FIREBASE_PROJECT_ID=maintenance-system-7ab2f ADMIN_EMAIL=admin@example.edu ADMIN_NAME='Initial Admin' ADMIN_PASSWORD='a-strong-temporary-password' node bootstrap-admin.js
```
Change the temporary password immediately. For production use, switch to an invitation/password reset flow rather than distributing temporary passwords.

## Implemented backend operations
- PB-12: Administrator-only create/edit/activate/deactivate users with Firebase Auth + Firestore; role validation, unique Auth email, active-state enforcement, protected reads and writes.
- PB-05: Category Manager assigns/reassigns an active Technician to an approved work order; My Tasks queries assigned work orders.
- PB-08: Assigned Technician transitions `Assigned` → `In Progress` → `Completed`, validated transactionally.
- PB-17: Category Manager approves a pending request, creating exactly one linked work order transactionally; assignment is a separate action.
- PB-24: Administrator creates/edits/deletes buildings, prevents duplicate names and deletion when referenced; active buildings appear in Requester new-request form.

## Important implementation boundaries
- Existing mockup pages for assets, notifications, priority configuration and some other features remain **demo-only**, not persisted in Firestore. Do not treat them as production-ready.
- Request submission uses a **simple keyword-based placeholder classification**, not a hosted LLM. AI triage is outside these four stories; replace before production use.
- New request photo uploads are not implemented (the form's images are not persisted). Firebase Storage integration is separate.
- Email/password is implemented. SSO is not enabled; add a provider and organization enrollment policy if required.
- Scheduling is not part of PB-05/08/17. The original review screen still contains scheduling UI from the prior mockup, but approval does not save a schedule.
- The existing Technician My Tasks visual layout is calendar-oriented. Newly assigned work orders have no schedule, so a future UI improvement should add an unscheduled list.
- Client UI access is backed by Firestore read rules; privileged mutations are implemented in Cloud Functions. Test against Firebase Emulator Suite and verify role isolation before production deployment.
- Category Manager routing is based on a `category` field on their account. Ensure it matches the request's category exactly.
- Users deactivated while signed in may retain an already-issued Firebase ID token briefly, but server-side operations and Firestore rules check active state; new sign-ins are blocked by disabled Firebase Auth accounts.
