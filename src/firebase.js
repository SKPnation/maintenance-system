import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID, storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET };
export const configured = Boolean(config.apiKey && config.projectId && config.appId);
export const app = initializeApp(configured ? config : { apiKey:'unconfigured', appId:'unconfigured', projectId:'unconfigured' });
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1');
export async function api(action, payload={}) { if (!configured) throw new Error('Configure your Firebase environment variables first.'); const result=await httpsCallable(functions, 'maintenanceApi')({action, payload}); return result.data; }
