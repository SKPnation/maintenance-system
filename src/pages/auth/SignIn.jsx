
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Icon, { BrandMark } from '../../components/Icon.jsx';
import {
  Button,
  Checkbox,
  Field,
  Input
} from '../../components/ui.jsx';

import { useAuth, ROLE_HOME } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const FEATURES = [
  {
    icon: 'fileText',
    title: 'Report',
    text: 'Submit and track maintenance requests quickly and easily.'
  },
  {
    icon: 'settings',
    title: 'Manage',
    text: 'Assign, schedule, and complete work orders efficiently.'
  },
  {
    icon: 'box',
    title: 'Track',
    text: 'Monitor assets, inventory, and maintenance history.'
  },
  {
    icon: 'bars',
    title: 'Improve',
    text: 'Gain insights with reports and analytics.'
  }
];

const ROLES = [
  {
    role: 'requester',
    icon: 'personSolid',
    title: 'Requesters',
    text: 'Submit and track maintenance requests'
  },
  {
    role: 'manager',
    icon: 'groupSolid',
    title: 'Category Managers',
    text: 'Review, approve and manage assigned requests'
  },
  {
    role: 'technician',
    icon: 'hardhatSolid',
    title: 'Technicians',
    text: 'Complete assigned work orders'
  },
  {
    role: 'admin',
    icon: 'shieldSolid',
    title: 'Administrators',
    text: 'Manage users, settings and system configuration'
  }
];

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Invalid email address or password. Please try again.';

    case 'auth/user-disabled':
      return 'Your account has been disabled. Contact your administrator.';

    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later.';

    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';

    case 'auth/operation-not-allowed':
      return 'Email and password authentication is not enabled. Contact your administrator.';

    case 'auth/unauthorized-domain':
      return 'This application domain is not authorized for Firebase Authentication.';

    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}

export default function SignIn() {
  const { signIn, resetPassword, user } = useAuth();

  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const normalizedEmail = email.trim();

const onSubmit = async (e) => {
  e.preventDefault();

  if (busy) return;

  setError('');

  const normalizedEmail = email.trim();

  if (!normalizedEmail || !password) {
    setError('Please enter your email and password.');
    return;
  }

  setBusy(true);

  try {
    const credential = await signIn(
      normalizedEmail,
      password,
      remember
    );

    console.log('Firebase login successful:', credential.user.uid);

    // Authentication succeeded, but the role is stored in Firestore.
    // Let the auth provider load the profile before redirecting.
    navigate('/', { replace: true });

  } catch (err) {
    console.error('Sign-in error:', err.code);
    setError(getAuthErrorMessage(err));

  } finally {
    setBusy(false);
  }
};

  const onReset = async () => {
    if (resetBusy) return;

    setError('');

    if (!normalizedEmail) {
      setError('Enter your email address before requesting a password reset.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setResetBusy(true);

    try {
      await resetPassword(normalizedEmail);

      toast(
        'If an account exists for this email, a password reset message will be sent.'
      );

    } catch (err) {
      console.error('Password reset error:', err.code);

      setError(
        err?.code === 'auth/too-many-requests'
          ? 'Too many requests. Please try again later.'
          : 'Unable to request a password reset. Please try again.'
      );

    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="auth">

      {/* LEFT SIDE */}
      <section className="auth-hero">
        <img
          className="auth-hero-photo"
          src="/images/login-hero.jpg"
          alt="Technician servicing a ceiling air conditioner"
        />

        <div className="auth-hero-tint" />
        <div className="auth-hero-fade" />

        <div className="auth-hero-content">
          <div className="brand">
            <BrandMark size={54} />

            <div className="brand-name">
              Maintenance
              <br />
              System
            </div>
          </div>

          <div className="eyebrow">
            PLAN &nbsp;•&nbsp; TRACK &nbsp;•&nbsp; RESOLVE
          </div>

          <h1 className="hero-title">
            Smarter
            <br />
            Maintenance
            <br />
            Operations
          </h1>

          <p className="hero-sub">
            Streamline maintenance requests, work orders,
            and asset management across your organization.
          </p>

          <div className="feats">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="feat">
                <div className="feat-ic">
                  <Icon
                    name={feature.icon}
                    size={34}
                    strokeWidth={1.7}
                  />
                </div>

                <div>
                  <div className="feat-title">
                    {feature.title}
                  </div>

                  <div className="feat-text">
                    {feature.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RIGHT SIDE */}
      <section className="auth-side">

        <form
          className="auth-form"
          onSubmit={onSubmit}
          noValidate
        >

          <div className="brand">
            <BrandMark
              size={56}
              color="#1D6AF0"
            />

            <div className="brand-name">
              Maintenance
              <br />
              System
            </div>
          </div>

          <h2 className="auth-title">
            Sign In
          </h2>

          <p className="auth-sub">
            Access your account to manage maintenance
            requests and work orders.
          </p>

          {/* EMAIL */}
          <Field
            label="Email Address"
            htmlFor="email"
          >
            <Input
              id="email"
              icon="mail"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              disabled={busy}
            />
          </Field>

          {/* PASSWORD */}
          <Field
            label="Password"
            htmlFor="password"
          >
            <Input
              id="password"
              icon="lock"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              disabled={busy}
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowPw((prev) => !prev)}
                  aria-label={
                    showPw ? 'Hide password' : 'Show password'
                  }
                  aria-pressed={showPw}
                  style={{
                    display: 'flex',
                    color: 'var(--text-3)'
                  }}
                >
                  <Icon
                    name={showPw ? 'eye' : 'eyeOff'}
                    size={22}
                  />
                </button>
              }
            />
          </Field>

          {/* REMEMBER ME / RESET PASSWORD */}
          <div className="auth-row">

            <Checkbox
              id="remember"
              checked={remember}
              onChange={setRemember}
              label="Remember me"
            />

            <button
              type="button"
              className="link"
              onClick={onReset}
              disabled={busy || resetBusy}
            >
              {resetBusy
                ? 'Sending...'
                : 'Forgot password?'}
            </button>

          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SIGN IN BUTTON */}
          <Button
            type="submit"
            size="lg"
            className="btn-signin"
            iconRight="arrowRight"
            disabled={busy || resetBusy}
          >
            {busy
              ? 'Signing in…'
              : 'Sign In'}
          </Button>

          <p className="auth-foot">
            Don’t have an account?{' '}
            Contact your system administrator.
          </p>

        </form>

        <div className="auth-divider" />

        {/* USER ROLES */}
        <aside className="used">

          <div className="used-title">
            Used by
          </div>

          <div className="used-hint">
            Role-based access is assigned by your administrator.
          </div>

          <div className="roles">

            {ROLES.map((role) => (
              <div
                key={role.role}
                className={`role role-${role.role}`}
              >
                <span className="role-ic">
                  <Icon
                    name={role.icon}
                    size={30}
                  />
                </span>

                <span>
                  <span
                    className="role-title"
                    style={{ display: 'block' }}
                  >
                    {role.title}
                  </span>

                  <span
                    className="role-text"
                    style={{ display: 'block' }}
                  >
                    {role.text}
                  </span>
                </span>
              </div>
            ))}

          </div>
        </aside>

      </section>
    </div>
  );
}
