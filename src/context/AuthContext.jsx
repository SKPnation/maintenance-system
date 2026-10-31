
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

import { auth, db, configured } from '../firebase.js';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!configured) {
      setAuthError('Firebase is not configured.');
      setLoading(false);
      return;
    }

    let unsubscribeDoc = () => {};
    let authVersion = 0;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        const version = ++authVersion;

        unsubscribeDoc();
        unsubscribeDoc = () => {};

        if (!firebaseUser) {
          setUser(null);
          setAuthError(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        setAuthError(null);

        unsubscribeDoc = onSnapshot(
          doc(db, 'users', firebaseUser.uid),

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
              firebaseSignOut(auth).catch(console.error);
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
  }, []);

  async function signIn(email, password, remember = true) {
    if (!configured) {
      throw new Error('Firebase is not configured.');
    }

    await setPersistence(
      auth,
      remember
        ? browserLocalPersistence
        : browserSessionPersistence
    );

    return signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
  }

  async function signOut() {
    await firebaseSignOut(auth);
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
        signIn,
        signOut,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
