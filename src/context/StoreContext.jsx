
import { useAuth } from './AuthContext.jsx';
import {
  collection,
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
    buildings: []
  });

  const { user } = useAuth();

  // -------------------------------------------------------
  // Firebase Realtime Subscriptions
  // -------------------------------------------------------

  useEffect(() => {
    if (!configured || !user) {
      setRemote({
        requests: [],
        workOrders: [],
        technicians: [],
        buildings: []
      });

      return;
    }

    const requestsQuery =
      user.role === 'requester'
        ? query(
            collection(db, 'requests'),
            where('requesterId', '==', user.id)
          )
        : user.role === 'manager'
          ? query(
              collection(db, 'requests'),
              where(
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
              where(
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

      ...(user.role === 'manager'
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

          if (name === 'technicians') {
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
    user?.category
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

    savePriority(priority) {
      dispatch({
        type: 'priority/save',
        priority
      });
    },

    deletePriority(id) {
      dispatch({
        type: 'priority/delete',
        id
      });
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
    state.workOrders
  ]);

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
              buildings: remote.buildings
            }
          : {}),

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
