
import { useAuth } from './AuthContext.jsx';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db, api, configured } from '../firebase.js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState
} from 'react';
import {
  ASSETS,
  CATEGORIES,
  TRADES,
  TRADE_DESCRIPTIONS,
  NOTIFICATIONS,
  PRIORITIES,
  REQUESTS,
  TECHNICIANS,
  WORK_ORDERS
} from '../data/mock.js';
import { nextId } from '../data/format.js';

// ---------------------------------------------------------
// Context
// ---------------------------------------------------------

const StoreContext = createContext(null);

const STORAGE_KEY = 'ms.store.v1';

// ---------------------------------------------------------
// Initial State
// ---------------------------------------------------------

const initialState = {
  requests: REQUESTS,
  workOrders: WORK_ORDERS,
  assets: ASSETS,
  notifications: NOTIFICATIONS,
  priorities: PRIORITIES,
  technicians: TECHNICIANS
};

// ---------------------------------------------------------
// Local Storage
// ---------------------------------------------------------

function loadState() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    return saved
      ? { ...initialState, ...saved }
      : initialState;
  } catch {
    return initialState;
  }
}

// ---------------------------------------------------------
// Reducer
// ---------------------------------------------------------

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return initialState;

    case 'request/add':
      return {
        ...state,
        requests: [
          action.request,
          ...state.requests
        ]
      };

    case 'request/update':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.id
            ? {
                ...request,
                ...action.changes
              }
            : request
        )
      };

    case 'workOrder/add':
      return {
        ...state,
        workOrders: [
          ...state.workOrders,
          action.workOrder
        ]
      };

    case 'workOrder/update':
      return {
        ...state,
        workOrders: state.workOrders.map((order) =>
          order.id === action.id
            ? {
                ...order,
                ...action.changes
              }
            : order
        )
      };

    case 'notification/read':
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id
            ? {
                ...notification,
                read: true
              }
            : notification
        )
      };

    case 'notification/readAll':
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.roles.includes(action.role)
            ? {
                ...notification,
                read: true
              }
            : notification
        )
      };

    case 'priority/save': {
      const exists = state.priorities.some(
        (priority) => priority.id === action.priority.id
      );

      return {
        ...state,
        priorities: exists
          ? state.priorities.map((priority) =>
              priority.id === action.priority.id
                ? action.priority
                : priority
            )
          : [
              ...state.priorities,
              action.priority
            ]
      };
    }

    case 'priority/delete':
      return {
        ...state,
        priorities: state.priorities.filter(
          (priority) => priority.id !== action.id
        )
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------
// Store Provider
// ---------------------------------------------------------

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    loadState
  );

  const [remote, setRemote] = useState({
    requests: [],
    workOrders: [],
    technicians: [],
    buildings: [],
    priorityLevels: [],
    categories: [],
    managers: [],
    assets: [],
    trades: []
  });

  // settings/routing exists once an admin has set up routing (PB-13);
  // settings/support holds the verified facilities contact (PB-35).
  const [settings, setSettings] = useState({ routing: null, support: null });

  const { user } = useAuth();

  useEffect(() => {
    if (!configured || !user) {
      setSettings({ routing: null, support: null });
      return;
    }

    const watch = (name) => onSnapshot(
      doc(db, 'settings', name),
      (snapshot) => setSettings((previous) => ({
        ...previous,
        [name]: snapshot.exists() ? snapshot.data() : false
      })),
      (error) => {
        console.error(`Failed to load ${name} settings:`, error);
        setSettings((previous) => ({ ...previous, [name]: false }));
      }
    );

    const stops = [watch('routing'), watch('support')];
    return () => stops.forEach((stop) => stop());
  }, [user?.id]);

  const routingConfigured = settings.routing ? true : settings.routing === false ? false : null;

  // -------------------------------------------------------
  // Firebase Realtime Subscriptions
  // -------------------------------------------------------

  useEffect(() => {
    if (!configured || !user) {
      setRemote({
        requests: [],
        workOrders: [],
        technicians: [],
        buildings: [],
        priorityLevels: [],
        categories: [],
        managers: [],
        assets: [],
        trades: []
      });

      return;
    }

    // Managers' queries depend on whether routing is set up.
    if (user.role === 'manager' && routingConfigured === null) {
      return;
    }

    const routed = routingConfigured === true;

    const requestsQuery =
      user.role === 'requester'
        ? query(
            collection(db, 'requests'),
            where('requesterId', '==', user.id)
          )
        : user.role === 'manager'
          ? query(
              collection(db, 'requests'),
              routed
                ? where('routedManagerId', '==', user.id)
                : where(
                    'routedCategory',
                    '==',
                    user.category || 'General Maintenance'
                  )
            )
          : null;

    const ordersQuery =
      user.role === 'technician'
        ? query(
            collection(db, 'workOrders'),
            where('technicianId', '==', user.id)
          )
        : user.role === 'manager'
          ? query(
              collection(db, 'workOrders'),
              routed
                ? where('managerId', '==', user.id)
                : where(
                    'category',
                    '==',
                    user.category || 'General'
                  )
            )
          : null;

    const targets = [
      ...(requestsQuery
        ? [['requests', requestsQuery]]
        : []),

      ...(ordersQuery
        ? [['workOrders', ordersQuery]]
        : []),

      [
        'buildings',
        collection(db, 'buildings')
      ],

      [
        'priorityLevels',
        collection(db, 'priorityLevels')
      ],

      [
        'categories',
        collection(db, 'categories')
      ],

      [
        'trades',
        collection(db, 'trades')
      ],

      ...(user.role !== 'requester'
        ? [['assets', collection(db, 'assets')]]
        : []),

      ...(user.role === 'admin'
        ? [
            [
              'managers',
              query(
                collection(db, 'users'),
                where('role', '==', 'manager')
              )
            ]
          ]
        : []),

      ...(['manager', 'admin'].includes(user.role)
        ? [
            [
              'technicians',
              query(
                collection(db, 'users'),
                where('role', '==', 'technician')
              )
            ]
          ]
        : [])
    ];

    const stops = targets.map(([name, firestoreQuery]) =>
      onSnapshot(
        firestoreQuery,
        (snapshot) => {
          let rows = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));

          if (name === 'technicians' || name === 'managers') {
            rows = rows.filter(
              (technician) => technician.active
            );
          }

          setRemote((previous) => ({
            ...previous,
            [name]: rows
          }));
        },
        (error) => {
          console.error(
            `Failed to load ${name}:`,
            error
          );
        }
      )
    );

    return () => {
      stops.forEach((unsubscribe) =>
        unsubscribe()
      );
    };
  }, [
    user?.id,
    user?.role,
    user?.category,
    routingConfigured
  ]);

  // -------------------------------------------------------
  // Persist Demo State
  // -------------------------------------------------------

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [state]);

  // -------------------------------------------------------
  // Actions
  // -------------------------------------------------------

  const actions = useMemo(() => ({

    // -----------------------------------------------------
    // Submit Maintenance Request
    // -----------------------------------------------------

    submitRequest(data, submittingUser) {
      const description =
        String(data.description || '').trim();

      const buildingId =
        String(data.buildingId || '').trim();

      const roomId =
        String(data.roomId || '').trim();

      if (description.length < 10) {
        throw new Error(
          'Description must contain at least 10 characters.'
        );
      }

      if (!buildingId) {
        throw new Error(
          'Please select a building.'
        );
      }

      if (!roomId) {
        throw new Error(
          'Please select a room.'
        );
      }

      const payload = {
        description,
        buildingId,
        roomId,
        phone: String(data.phone || '').trim(),
        email: String(data.email || '').trim(),
        photos: Array.isArray(data.photos)
          ? data.photos
          : []
      };

      // Firebase backend
      if (configured) {
        console.log(
          'Submitting maintenance request:',
          {
            buildingId: payload.buildingId,
            roomId: payload.roomId,
            description: payload.description
          }
        );

        return api(
          'submitRequest',
          payload
        ).then((result) => {
          if (!result || !result.id) {
            throw new Error(
              'The server did not return a request ID.'
            );
          }

          return result.id;
        });
      }

      // ---------------------------------------------------
      // Mock / Demo Mode
      // ---------------------------------------------------

      const id = nextId(
        'MR-2026-',
        state.requests.map(
          (request) => request.id
        )
      );

      const now = new Date();

      const text = description.toLowerCase();

      const guess =
        /spark|outlet|light|switch|power|electric/.test(text)
          ? {
              category: 'Electrical',
              trade: 'Electrician'
            }
          : /leak|water|pipe|drain|toilet/.test(text)
            ? {
                category: 'Plumbing',
                trade: 'Plumber'
              }
            : /ac|air|cool|heat|hvac|thermostat/.test(text)
              ? {
                  category: 'HVAC',
                  trade: 'HVAC Technician'
                }
              : {
                  category: 'General',
                  trade: 'General Maintenance'
                };

      const safety =
        /spark|smoke|gas|fire|flood|shock/.test(text);

      const request = {
        id,

        requesterId: submittingUser.id,
        requesterName: submittingUser.name,

        description,

        buildingId,
        roomId,

        // Temporary display location for demo mode.
        location: `${buildingId} / ${roomId}`,

        phone: payload.phone,
        email: payload.email,
        photos: payload.photos,

        submittedAt: now.toISOString(),

        status: 'Submitted',

        priority: safety
          ? 'High'
          : 'Medium',

        safety,

        ai: {
          ...guess,

          priority: safety
            ? 'High'
            : 'Medium',

          suggestedAction:
            'Inspect the reported issue on site and schedule the required repair.',

          safetyFlag: safety,

          confidence: 85,

          analyzedAt: null
        }
      };

      dispatch({
        type: 'request/add',
        request
      });

      return id;
    },

    // -----------------------------------------------------
    // AI Analysis
    // -----------------------------------------------------

    analyzeRequest(id) {
      return api('analyzeRequest', { id });
    },

    reviewRecommendation(id, changes, note) {
      return api('reviewRecommendation', {
        id,
        changes,
        note
      });
    },

    // PB-06: schedule or reschedule an assigned work order.
    scheduleWorkOrder(id, { serviceDate, startTime, durationHours, reason }) {
      return api('scheduleWorkOrder', {
        id,
        serviceDate,
        startTime,
        durationHours: Number(durationHours),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        reason
      });
    },

    listScheduleHistory(id) {
      return api('listScheduleHistory', { id }).then((r) => r.entries || []);
    },

    assignTechnician(id, technicianId) {
      return api('assignTechnician', { id, technicianId });
    },

    // PB-08: Assigned → In Progress → Completed.
    updateWorkOrderStatus(id, status) {
      return api('updateWorkOrderStatus', { id, status });
    },

    // PB-09: internal technician notes.
    addWorkOrderNote(id, text, kind) {
      return api('addWorkOrderNote', { id, text, kind });
    },

    listWorkOrderNotes(id) {
      return api('listWorkOrderNotes', { id }).then((r) => r.notes || []);
    },

    // -----------------------------------------------------
    // Update Request
    // -----------------------------------------------------

    updateRequest(id, changes) {
      if (configured) {
        return api('updateRequest', {
          id,
          changes
        });
      }

      dispatch({
        type: 'request/update',
        id,
        changes
      });
    },

    // -----------------------------------------------------
    // Reject Request
    // -----------------------------------------------------

    rejectRequest(id, note) {
      if (configured) {
        return api('rejectRequest', {
          id,
          note
        });
      }

      dispatch({
        type: 'request/update',
        id,
        changes: {
          status: 'Rejected',
          managerNote: note
        }
      });
    },

    // -----------------------------------------------------
    // Approve Request
    // -----------------------------------------------------

    approveRequest(requestId, workOrder) {
      if (configured) {
        return api('approveRequest', {
          requestId,
          workOrder
        }).then((result) => result.id);
      }

      const id = nextId(
        'WO-2026-',
        state.workOrders.map(
          (order) => order.id
        )
      );

      const request = state.requests.find(
        (item) => item.id === requestId
      );

      dispatch({
        type: 'workOrder/add',

        workOrder: {
          id,
          requestId,

          title: workOrder.title,
          fullTitle: workOrder.title,
          description: workOrder.description,

          location: request?.location || '',

          category: workOrder.category,
          trade: workOrder.trade,
          priority: workOrder.priority,
          safety: workOrder.safety,

          technicianId: workOrder.technicianId,
          scheduledAt: workOrder.scheduledAt,
          durationHours: workOrder.durationHours,

          status: 'Assigned',

          image: request?.photos?.[0] || null,

          checklist: [],
          parts: [],

          notes: workOrder.notes
            ? [
                {
                  at: new Date().toISOString(),
                  text: workOrder.notes
                }
              ]
            : []
        }
      });

      dispatch({
        type: 'request/update',
        id: requestId,
        changes: {
          status: 'Approved',
          priority: workOrder.priority,
          safety: workOrder.safety,
          workOrderId: id
        }
      });

      return id;
    },

    // -----------------------------------------------------
    // Update Work Order
    // -----------------------------------------------------

    updateWorkOrder(id, changes) {
      if (configured) {
        return api('updateWorkOrderStatus', {
          id,
          status: changes.status
        });
      }

      dispatch({
        type: 'workOrder/update',
        id,
        changes
      });
    },

    // -----------------------------------------------------
    // Notifications
    // -----------------------------------------------------

    markNotificationRead(id) {
      dispatch({
        type: 'notification/read',
        id
      });
    },

    markAllNotificationsRead(role) {
      dispatch({
        type: 'notification/readAll',
        role
      });
    },

    // -----------------------------------------------------
    // Priorities
    // -----------------------------------------------------

    // Saved to Firestore once the admin has imported the levels; until then
    // edits stay in this browser like the rest of the demo data.
    savePriority(priority) {
      const { isNew, ...level } = priority;
      if (configured && remote.priorityLevels.length) {
        return api('savePriorityLevel', { ...level, id: isNew ? undefined : level.id });
      }
      dispatch({ type: 'priority/save', priority: level });
      return Promise.resolve({ id: level.id });
    },

    deletePriority(id) {
      if (configured && remote.priorityLevels.length) {
        return api('deletePriorityLevel', { id });
      }
      dispatch({ type: 'priority/delete', id });
      return Promise.resolve();
    },

    // Trades: first save copies the built-in list; then each edit is saved.
    importTrades() {
      return api('importTrades', {
        trades: TRADES.map((name) => ({ name, description: TRADE_DESCRIPTIONS[name] || '', active: true }))
      });
    },

    saveTrade(trade) {
      return api('saveTrade', trade);
    },

    importPriorities() {
      return api('importPriorityLevels', {
        levels: state.priorities.map(({ id, isNew, ...level }) => level)
      });
    },

    // -----------------------------------------------------
    // Categories and routing (PB-13)
    // -----------------------------------------------------

    importRouting(categories) {
      return api('importRouting', { categories });
    },

    saveCategory(category) {
      return api('saveCategory', category);
    },

    // PB-04: internal review log for a request.
    listReviewHistory(id) {
      return api('listReviewHistory', { id });
    },

    // -----------------------------------------------------
    // Assets (PB-20) and support contact (PB-35)
    // -----------------------------------------------------

    createAsset(asset) {
      return api('createAsset', asset);
    },

    updateAsset(asset) {
      return api('updateAsset', asset);
    },

    saveSupportSettings(values) {
      return api('saveSupportSettings', values);
    },

    // -----------------------------------------------------
    // Reset Demo Data
    // -----------------------------------------------------

    resetDemoData() {
      dispatch({
        type: 'reset'
      });
    }

  }), [
    state.requests,
    state.workOrders,
    state.priorities,
    remote.priorityLevels.length
  ]);

  const prioritiesSaved = configured && remote.priorityLevels.length > 0;
  const priorities = prioritiesSaved
    ? [...remote.priorityLevels].sort((a, b) => (a.rank || 999) - (b.rank || 999))
    : state.priorities;
  const priorityNames = priorities.filter((p) => p.active).map((p) => p.name);

  // Trades: saved trades, or the built-in list until an admin saves them.
  const tradesSaved = configured && remote.trades.length > 0;
  const trades = tradesSaved
    ? [...remote.trades].sort((a, b) => a.name.localeCompare(b.name))
    : TRADES.map((name) => ({ id: name, name, description: TRADE_DESCRIPTIONS[name] || '', active: true }));
  const tradeNames = trades.filter((t) => t.active).map((t) => t.name);

  // Categories: saved routing categories, or the built-in list before setup.
  const categories = routingConfigured && remote.categories.length
    ? [...remote.categories].sort((a, b) => (a.rank || 999) - (b.rank || 999))
    : CATEGORIES.map((name, index) => ({ id: name, name, active: true, managerId: '', rank: index + 1 }));
  const categoryNames = categories.filter((c) => c.active).map((c) => c.name);

  // Categories this manager currently receives.
  const managedCategories = user?.role !== 'manager'
    ? []
    : routingConfigured
      ? categories.filter((c) => c.active && c.managerId === user.id).map((c) => c.name)
      : [user.category].filter(Boolean);

  // A verified contact only; never a sample number.
  const support = settings.support || {};
  const emergencyContact = support.verified && String(support.emergencyPhone || '').replace(/\D/g, '').length >= 7
    ? { label: support.emergencyLabel || 'Facilities emergency line', phone: support.emergencyPhone }
    : null;

  // -------------------------------------------------------
  // Context Provider
  // -------------------------------------------------------

  return (
    <StoreContext.Provider
      value={{
        ...state,

        ...(configured
          ? {
              requests: remote.requests,
              workOrders: remote.workOrders,
              technicians: remote.technicians,
              buildings: remote.buildings,
              assets: remote.assets,
              managers: remote.managers
            }
          : { managers: [] }),

        trades,
        tradesSaved,
        tradeNames,

        categories,
        categoryNames,
        managedCategories,
        routingConfigured,
        supportSettings: support,
        emergencyContact,

        priorities,
        prioritiesSaved,
        priorityNames,

        ...actions
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// ---------------------------------------------------------
// Hook
// ---------------------------------------------------------

export const useStore = () =>
  useContext(StoreContext);

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

export const unreadCountFor = (
  notifications,
  role
) =>
  notifications.filter(
    (notification) =>
      notification.roles.includes(role) &&
      !notification.read
  ).length;
