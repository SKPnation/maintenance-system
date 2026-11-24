# Sprint 4 backlog

| Story | Title | Status in this branch |
|---|---|---|
| PB-13 | Manage categories and manager routing | Implemented: Categories and Routing Rules pages, `categories` collection, default seed, General Maintenance fallback |
| PB-35 | Access maintenance help and emergency contact information | Implemented: Help & Support page, verified facilities contact (System Settings) |
| PB-39 | Edit, deactivate, or remove priority definitions | Mostly delivered earlier (priority levels in Firestore); this branch adds "Deactivate instead" when deletion is blocked and keeps inactive priorities visible on existing records |
| PB-04 | Review and correct AI triage | Implemented: category corrections with rerouting, optional note, review history |
| PB-11 | View and filter the work-order dashboard | Implemented: category filter, clear filters, filterable Dashboard |
| PB-20 | Create and edit asset records | Implemented: `assets` collection, Administrator create/edit with unique asset tags |

---

## PB-13 Manage categories and manager routing

**User story**
As an Administrator, I want to manage maintenance categories and routing rules, so that requests reach the right Category Manager as responsibilities change.

**Scope**
Use the Categories and Routing Rules pages to maintain active categories and their assigned managers. Start with Appliance/Equipment → Appliance Manager, Electrical and HVAC → Electrical Category Manager, and Information Technology → IT Manager. General Maintenance handles requests with no valid match.

**Acceptance criteria**
- An Administrator can add, edit, and deactivate a category and save a mapping from an active category to an eligible Category Manager. Saved changes persist after reload.
- The next routing decision uses the saved mapping. HVAC routes to the Electrical Category Manager under the default rules, and unknown, inactive, or unmapped categories go to General Maintenance for manual review.
- Users without the Administrator role cannot change categories or routing rules.

**Developer tasks**
- Add category and manager mapping storage, seed the agreed defaults, and enforce Administrator permissions for changes.
- Build the Categories and Routing Rules forms, then connect and test the shared routing lookup and General Maintenance fallback.

---

## PB-35 Access maintenance help and emergency contact information

**User story**
As a Requester, I want to find maintenance help and the facilities emergency contact, so that I know how to report a routine issue or get urgent assistance.

**Scope**
Cover Help & Support, request-writing tips, and the emergency contact shown on Requester pages. The team supplies and verifies the facilities contact before it is published.

**Acceptance criteria**
- A signed-in Requester can open Help & Support from the sidebar and find tips for describing a problem, giving its location, and attaching photos when available.
- The Requester Home and New Request pages distinguish urgent safety issues from routine submissions and show the approved facilities contact when configured.
- If no contact has been verified, the emergency guidance remains visible without displaying a sample phone number or a broken call link.

**Developer tasks**
- Build the Help & Support page and connect it to the Requester sidebar.
- Reuse the emergency guidance on Home and New Request, and verify that it displays correctly with and without an approved contact.

---

## PB-39 Edit, deactivate, or remove priority definitions

**User story**
As an Administrator, I want to edit, deactivate, or remove priority definitions, so that maintenance requests use current urgency criteria and service targets.

**Scope**
Extend the existing Priority Levels page. Maintenance of a priority definition is separate from assigning a priority to a request.

**Acceptance criteria**
- An Administrator can edit a priority's name, color, criteria, and response and resolution targets. Valid changes remain visible after reload.
- An Administrator can deactivate or reactivate a priority. Inactive levels are unavailable for new assignments and AI recommendations, while existing requests and work orders keep their priority reference.
- An Administrator can delete an unused priority. If a request or work order uses it, the system blocks deletion and offers deactivation instead.

**Developer tasks**
- Connect the edit, active toggle, and delete controls to saved priority definitions, with Administrator permissions and field validation.
- Check for existing references before deletion, filter inactive levels out of new selections and recommendations, and verify that existing records retain their priority.

---

## PB-04 Review and correct AI triage

**User story**
As a Category Manager, I want to review and correct AI recommendations on requests routed to my queue, so that maintenance decisions use accurate details.

**Scope**
Build on the review flow delivered in Sprint 3. This follow-up verifies that review changes are saved, recorded, and rerouted using the Administrator's category mappings. Approval and work-order creation remain in PB-17.

**Acceptance criteria**
- An authorized Category Manager can open a routed request, see the original submission and AI recommendation, and save corrections to category, priority, trade, or safety flag with an optional note.
- After saving, the corrected fields persist and History retains the original recommendation, what changed, who changed it, and when.
- If the corrected category maps to a different manager, the request moves to that manager's queue. An unrecognized or unmapped category goes to General Maintenance for manual review.

**Developer tasks**
- Verify the existing review screen and wire any missing save and history behavior while preserving the original submission and AI recommendation.
- Use PB-13's routing rules on category changes, and verify access, persistence, and queue handoff with sample requests.

---

## PB-11 View and filter the work-order dashboard

**User story**
As a Category Manager, I want to view and filter the work-order dashboard, so that I can find active work and follow its progress.

**Scope**
Cover the Manager Dashboard and Work Orders views. My Queue for incoming requests is a separate story (SCRUM-55).

**Acceptance criteria**
- The Manager Dashboard and Work Orders views show saved work orders the Category Manager is authorized to see, including category, priority, status, assigned Technician, and scheduled date when available.
- The Category Manager can filter by category, priority, status, Technician, and scheduled date; combined filters show matching orders, and clearing them restores the full authorized list.
- An empty result shows a clear message, and work orders outside the manager's permitted scope are not returned.

**Developer tasks**
- Add a work-order query with permission checks and support for the required filters.
- Connect the Manager Dashboard and Work Orders views to saved data and verify combined filters, clearing, and empty results.

---

## PB-20 Create and edit asset records

**User story**
As an Administrator, I want to create and edit asset records, so that the maintenance team can rely on accurate equipment information.

**Scope**
Use the existing asset design for identification, equipment details, location, status, dates, and related documents. This story covers create and edit; asset deletion is outside its scope.

**Acceptance criteria**
- An Administrator can create an asset with a unique asset tag and the required equipment, location, and status fields. It appears in the asset list after saving.
- An Administrator can update an asset's details, dates, and related document information. Authorized viewers see the saved changes after reopening the record.
- Missing required data, duplicate asset tags, and attempts by other roles to create or edit an asset are rejected without changing saved records.

**Developer tasks**
- Add or extend asset storage and protected create and update actions, with required-field and asset-tag validation.
- Build the Administrator asset forms, connect them to the existing asset list and detail views, and verify create, edit, and permission checks.
