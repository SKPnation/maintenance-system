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
- PB-06: Category Manager schedules/reschedules an assigned work order (`scheduleWorkOrder`) with service date, start time, time zone and estimated duration. The server rejects missing/invalid/past values, unauthorized users and any overlap with the technician's other open work across the full duration (checked inside the transaction). Every change is logged in `workOrders/{id}/scheduleHistory` with the previous and new schedule (`listScheduleHistory`). Schedules show on Manager **Calendar**, **Work Orders** and Technician **My Tasks**. Approval no longer saves a schedule.
- PB-08: `updateWorkOrderStatus` — only the assigned technician can move `Assigned` → `In Progress` → `Completed`; saves `status` and `statusUpdatedAt`. The request's own status is left unchanged; progress is mirrored to `requests.workOrderStatus`.
- PB-09: `addWorkOrderNote` / `listWorkOrderNotes` — non-empty progress or completion notes stored in `workOrders/{id}/notes` with author and server timestamp, listed oldest first. Only the assigned technician can add; the assigned technician and the category's manager can read. Firestore rules deny all client reads of these subcollections, so requesters cannot see them.
- PB-10: Requesters read only their own `requests` (Firestore rules). Each request carries requester-safe fields kept in sync by the backend: `assignedCategory`, `workOrderStatus`, `workOrderStatusUpdatedAt`, `serviceScheduledAt`, `serviceDurationHours` and a `history` of submitted/approved/rejected/scheduled/rescheduled/work-status events. Internal notes are never copied onto the request.

### Tests
`cd maintenance-functions && npm test` runs the scheduling/status/note rules and the callable handlers against an in-memory Firestore stand-in (access control, conflicts, history, ordering). Re-run against the Firebase Emulator Suite before production.

## Important implementation boundaries
- Existing mockup pages for assets, notifications, priority configuration and some other features remain **demo-only**, not persisted in Firestore. Do not treat them as production-ready.
- Request submission uses a **simple keyword-based placeholder classification**, not a hosted LLM. AI triage is outside these four stories; replace before production use.
- New request photo uploads are not implemented (the form's images are not persisted). Firebase Storage integration is separate.
- Email/password is implemented. SSO is not enabled; add a provider and organization enrollment policy if required.
- Schedule times are entered in the manager's browser time zone, which is sent with the request and stored on the work order. If none is sent the server uses `SCHEDULE_TIME_ZONE` (default `America/Chicago`).
- Two codebases (`functions/` and `maintenance-functions/`) both export `maintenanceApi`. The frontend's request, scheduling, status and note calls target `maintenance-functions` (which also runs the automatic AI analysis trigger). Only the old manager Triage page still calls `analyzeRequest`/`reviewRecommendation`, which exist only in the legacy codebase. Deploy it with `firebase deploy --only functions:maintenance-backend`, and remove the legacy `functions/` codebase from `firebase.json` once you've confirmed it is no longer deployed.
- Client UI access is backed by Firestore read rules; privileged mutations are implemented in Cloud Functions. Test against Firebase Emulator Suite and verify role isolation before production deployment.
- Category Manager routing is based on a `category` field on their account. Ensure it matches the request's category exactly.
- Users deactivated while signed in may retain an already-issued Firebase ID token briefly, but server-side operations and Firestore rules check active state; new sign-ins are blocked by disabled Firebase Auth accounts.
