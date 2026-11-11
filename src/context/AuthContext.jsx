import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';

import {
  doc,
  onSnapshot
} from 'firebase/firestore';

import {
  activateSession,
  auth,
  configured,
  DEFAULT_SLOT,
  sessionFor
} from '../firebase.js';

const AuthContext = createContext(null);

const VALID_ROLES = [
  'requester',
  'manager',
  'technician',
  'admin'
];

export const ROLE_HOME = {
  requester: '/requester',
  manager: '/manager/queue',
  technician: '/technician/tasks',
  admin: '/admin/users'
};

// ---------------------------------------------------------
// Signed-in accounts remembered in this browser
// ---------------------------------------------------------

const ACCOUNTS_KEY = 'ms.accounts.v1';
const ACTIVE_KEY = 'ms.activeSlot.v1';

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); switching just won't persist.
  }
}

const sameEmail = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [accounts, setAccounts] = useState(() => readJson(ACCOUNTS_KEY, []));
  const [activeSlot, setActiveSlot] = useState(() => readJson(ACTIVE_KEY, DEFAULT_SLOT));

  const saveAccounts = (update) => {
    setAccounts((previous) => {
      const next = typeof update === 'function' ? update(previous) : update;
      writeJson(ACCOUNTS_KEY, next);
      return next;
    });
  };

  const activate = (slot) => {
    writeJson(ACTIVE_KEY, slot);
    setActiveSlot(slot);
  };

  // Watch the active account's session and load its profile.
  useEffect(() => {
    if (!configured) {
      setAuthError('Firebase is not configured.');
      setLoading(false);
      return;
    }

    const session = activateSession(activeSlot);

    setUser(null);
    setLoading(true);
    setAuthError(null);

    let unsubscribeDoc = () => {};
    let authVersion = 0;

    const unsubscribeAuth = onAuthStateChanged(
      session.auth,
      (firebaseUser) => {
        const version = ++authVersion;

        unsubscribeDoc();
        unsubscribeDoc = () => {};

        if (!firebaseUser) {
          // This slot's session ended (signed out, expired, or never signed in).
          saveAccounts((list) => list.filter((a) => a.slot !== activeSlot));
          const fallback = readJson(ACCOUNTS_KEY, []).find((a) => a.slot !== activeSlot);

          if (fallback) {
            activate(fallback.slot);
            return;
          }

          setUser(null);
          setAuthError(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        setAuthError(null);

        unsubscribeDoc = onSnapshot(
          doc(session.db, 'users', firebaseUser.uid),

          (snapshot) => {
            if (version !== authVersion) return;

            const data = snapshot.data();

            if (!snapshot.exists()) {
              setUser(null);
              setAuthError(
                'Your account profile has not been provisioned. Contact your administrator.'
              );
              setLoading(false);
              return;
            }

            if (data.active !== true) {
              setUser(null);
              setAuthError('Your account is inactive.');
              setLoading(false);
              firebaseSignOut(session.auth).catch(console.error);
              return;
            }

            if (!VALID_ROLES.includes(data.role)) {
              setUser(null);
              setAuthError('Your account has an invalid role.');
              setLoading(false);
              return;
            }

            setUser({
              ...data,
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email
            });

            // Remember this account for the switcher.
            saveAccounts((list) => [
              ...list.filter((a) => a.slot !== activeSlot && a.uid !== firebaseUser.uid),
              {
                slot: activeSlot,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: data.name || firebaseUser.email,
                role: data.role
              }
            ]);

            setAuthError(null);
            setLoading(false);
          },

          (error) => {
            if (version !== authVersion) return;

            console.error(
              'Firestore user profile error:',
              error.code,
              error.message
            );

            setUser(null);
            setAuthError(
              'Unable to load your account profile.'
            );
            setLoading(false);
          }
        );
      },

      (error) => {
        console.error('Firebase auth observer:', error);
        setAuthError('Unable to verify authentication.');
        setLoading(false);
      }
    );

    return () => {
      authVersion++;
      unsubscribeAuth();
      unsubscribeDoc();
    };
  }, [activeSlot]);

  // Sign in to an account. An account already signed in here is just switched to;
  // a new one gets its own session so the current one stays signed in.
  async function signIn(email, password, remember = true) {
    if (!configured) {
      throw new Error('Firebase is not configured.');
    }

    const existing = accounts.find((a) => sameEmail(a.email, email));

    if (existing && sessionFor(existing.slot).auth.currentUser) {
      activate(existing.slot);
      return { user: { uid: existing.uid } };
    }

    const slot = existing?.slot ||
      (auth.currentUser ? `account-${Date.now()}` : activeSlot);
    const session = sessionFor(slot);

    await setPersistence(
      session.auth,
      remember
        ? browserLocalPersistence
        : browserSessionPersistence
    );

    const credential = await signInWithEmailAndPassword(
      session.auth,
      email.trim(),
      password
    );

    activate(slot);

    return credential;
  }

  function switchAccount(slot) {
    if (slot !== activeSlot) activate(slot);
  }

  // Sign out of the current account only; switch to another signed-in one if any.
  async function signOut() {
    const current = activeSlot;
    const next = accounts.find((a) => a.slot !== current);

    saveAccounts((list) => list.filter((a) => a.slot !== current));
    await firebaseSignOut(sessionFor(current).auth);

    if (next) activate(next.slot);
  }

  async function signOutAll() {
    const slots = new Set([activeSlot, ...accounts.map((a) => a.slot)]);
    saveAccounts([]);
    await Promise.all([...slots].map((slot) => firebaseSignOut(sessionFor(slot).auth).catch(console.error)));
    activate(DEFAULT_SLOT);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(
      auth,
      email.trim()
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        accounts,
        activeSlot,
        signIn,
        switchAccount,
        signOut,
        signOutAll,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
