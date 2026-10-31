# Maintenance System - Frontend

React frontend for the facilities maintenance system: requesters report issues, category managers review AI recommendations and create work orders, technicians complete them, and admins configure the system.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Requires Node 18+.

## Signing in (demo)

Authentication is mocked. On the Sign In page, click any card under **Used by** to sign in as that role, or type one of these emails with any password:

| Role | User | Email | Lands on |
|---|---|---|---|
| Requester | Alex Rivera | alex.rivera@company.com | Home |
| Category Manager | Erin Martinez (Electrical) | erin.martinez@company.com | My Queue |
| Technician | James Thompson (HVAC) | james.thompson@company.com | My Tasks |
| Administrator | Admin User | admin@company.com | Priority Levels |

Use the user menu (top right) to **Switch role**, **Reset demo data**, or **Log out**. Each role can only open its own URLs; anything else redirects to that role's home.

## Try the full flow

1. As the **requester**, submit a request → you land on the confirmation screen with a live tracker.
2. As the **manager**, open *My Queue*, click **Review**, adjust fields, assign a technician and date, then **Approve & Create Work Order**.
3. As the **technician**, *My Tasks* opens on the next scheduled job. Update the status, tick checklist items, add parts and notes, or **Mark as Complete**.
4. As the **admin**, add, edit, deactivate or delete priority levels.

Data persists in `localStorage` so it survives a refresh. **Reset demo data** restores the original set. (Uploaded photos use temporary browser URLs and won't survive a refresh.)

## Screens

| Role | Screen | Route |
|---|---|---|
| All | Sign In | `/login` |
| Requester | Home | `/requester` |
| Requester | New Request | `/requester/new` |
| Requester | Confirmation / Request detail | `/requester/requests/:id` |
| Requester | My Requests | `/requester/requests` |
| Manager | My Queue (with detail panel) | `/manager/queue` |
| Manager | Review & Create Work Order | `/manager/review/:id` |
| Manager, Technician | Assets | `/manager/assets`, `/technician/assets` |
| Technician | My Tasks | `/technician/tasks` |
| All | Notifications | `/<role>/notifications` |
| Admin | Priority Levels | `/admin/priority-levels` |

Sidebar items without a design yet (Dashboards, Work Orders, Calendar, Team, Reports, Parts/Inventory, Users & Roles, Categories, Trades, Routing Rules, Locations, System Settings, Audit Logs, Settings, Help & Support) route to a "Coming soon" page so the navigation is complete. Add a page component and swap it in `src/App.jsx`.

## Project structure

```
src/
  App.jsx                 routes for every role
  main.jsx                providers: Router → Store → Auth → Toast
  styles/global.css       design tokens, components, page styles, breakpoints
  data/
    mock.js               users, requests, work orders, assets, notifications, priorities
    format.js             date/duration helpers
  context/
    AuthContext.jsx       mock sign-in, role → home mapping
    StoreContext.jsx      app state + actions (submit, approve, reject, update WO, …)
    ToastContext.jsx      toast messages
  components/
    AppLayout.jsx         sidebar + top bar + role guard
    Sidebar.jsx, navConfig.js   role-specific navigation with live badges
    Topbar.jsx            search, notifications bell, user menu
    ui.jsx                Button, Pill, Card, Field, Input, Select, Tabs, Modal, …
    Icon.jsx              icon set + brand mark
  pages/
    auth/ requester/ manager/ technician/ shared/ admin/
public/images/            photos cropped from the design mockups
```

## Connecting a backend

All reads come from `useStore()` and all writes go through its actions in `src/context/StoreContext.jsx` (`submitRequest`, `approveRequest`, `rejectRequest`, `updateWorkOrder`, `savePriority`, …). Replace those with API calls and the pages don't need to change. The objects in `src/data/mock.js` document the expected data shapes. Replace `signIn` in `AuthContext.jsx` with your auth provider, and remove the `localStorage` persistence in the store.

The AI classification on submit is a keyword placeholder in `submitRequest`; the real analysis should come from the backend.

## Notes

- **Google sign-in:** the button has an empty dashed slot (`.google-slot`). Put Google's official "G" mark there, as their branding guidelines require, and wire up OAuth.
- Photos in `public/images/` were cropped from the mockups; swap them for real asset photos.
- Font: Inter from Google Fonts (falls back to system fonts).
# maintenance-system
