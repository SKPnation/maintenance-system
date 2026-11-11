import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID, storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET };
const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
export const configured = Boolean(config.apiKey && config.projectId && config.appId);
const appConfig = configured ? config : { apiKey: 'unconfigured', appId: 'unconfigured', projectId: 'unconfigured' };

// Each signed-in account gets its own Firebase app instance ("slot"), so its
// session persists independently and the user can switch without signing in again.
export const DEFAULT_SLOT = '[DEFAULT]';
export const app = initializeApp(appConfig);

const sessions = new Map();
const makeSession = (instance) => ({
  app: instance,
  auth: getAuth(instance),
  db: getFirestore(instance),
  functions: getFunctions(instance, region),
});
sessions.set(DEFAULT_SLOT, makeSession(app));

// Get (or create) the session for a slot without making it active.
export function sessionFor(slot = DEFAULT_SLOT) {
  if (!sessions.has(slot)) sessions.set(slot, makeSession(initializeApp(appConfig, slot)));
  return sessions.get(slot);
}

// Live bindings: modules importing these always see the active account's instances.
export let auth;
export let db;
export let functions;

export function activateSession(slot = DEFAULT_SLOT) {
  const session = sessionFor(slot);
  ({ auth, db, functions } = session);
  return session;
}

activateSession(DEFAULT_SLOT);

export async function api(action, payload = {}) {
  if (!configured) throw new Error('Configure your Firebase environment variables first.');
  const result = await httpsCallable(functions, 'maintenanceApi')({ action, payload });
  return result.data;
}
