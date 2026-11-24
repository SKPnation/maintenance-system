import { useMemo } from 'react';
import { configured } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';

// "Electrical", "Electrical & HVAC", "A, B & C"
export const joinNames = (names) => (names.length <= 1 ? names[0] || '' : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`);

// Requests and work orders this manager may see. With Firebase the store's
// queries are already limited by routing and Firestore rules; in demo mode we
// filter by the manager's category.
export function useManagerScope() {
  const { user } = useAuth();
  const { requests = [], workOrders = [], managedCategories = [] } = useStore();

  return useMemo(() => {
    const categories = configured ? managedCategories : [user?.category].filter(Boolean);
    const inScope = (category) => categories.includes(category);

    return {
      requests: configured ? requests : requests.filter((r) => inScope(r.routedCategory || r.category)),
      workOrders: configured ? workOrders : workOrders.filter((w) => inScope(w.category)),
      categories,
      label: categories.length ? joinNames(categories) : 'your categories',
    };
  }, [requests, workOrders, managedCategories.join('|'), user?.category]);
}
