import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
  ExternalLink,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from './AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Email verification required state
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState('');
  const [devLink, setDevLink] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const { login, resendVerification, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // If already authenticated, redirect
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsUnverified(false);
    setResendMsg('');
    setResendErr('');
    setDevLink(null);

    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const errMsg = err.message || 'Login failed. Please verify your credentials.';
      setError(errMsg);

      if (
        errMsg.toLowerCase().includes('verify your email') ||
        errMsg.toLowerCase().includes('verification required')
      ) {
        setIsUnverified(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendFromLogin = async () => {
    if (!email.trim() || cooldown > 0) return;
    setResendErr('');
    setResendMsg('');
    try {
      setResending(true);
      const res = await resendVerification(email.trim());
      setResendMsg(res?.message || 'Verification link sent! Check your inbox.');
      setCooldown(60);
      if (res?.dev_link) {
        setDevLink(res.dev_link);
      }
    } catch (err) {
      setResendErr(err.message || 'Failed to send verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleQuickFill = (demoUser, demoPass) => {
    setEmail(demoUser);
    setPassword(demoPass);
    setError('');
    setIsUnverified(false);
    setResendMsg('');
    setResendErr('');
  };

  return (
    <div className="auth-viewport">
      <div className="auth-card-container">
        {/* Brand Header */}
        <div className="auth-brand-block">
          <div className="auth-brand-logo">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h1 className="auth-main-title">Sign in to Kappy Notes</h1>
          <p className="auth-sub-title">Enter your credentials to access your private workspace</p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="alert-banner alert-banner-danger" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Unverified Email Warning State */}
        {isUnverified && (
          <div className="auth-unverified-callout">
            <div className="callout-header">
              <AlertCircle size={17} />
              <span>Email Verification Required</span>
            </div>
            <p className="callout-text">
              Your account has been registered, but your email address requires confirmation before logging in.
            </p>

            {resendMsg && (
              <div className="alert-banner alert-banner-success mt-2">
                <CheckCircle2 size={16} />
                <span>{resendMsg}</span>
              </div>
            )}

            {resendErr && (
              <div className="alert-banner alert-banner-danger mt-2">
                <AlertCircle size={16} />
                <span>{resendErr}</span>
              </div>
            )}

            {devLink && (
              <div className="auth-dev-helper-box">
                <span className="dev-tag">Local Dev Link</span>
                <a href={devLink} target="_blank" rel="noreferrer" className="dev-link-anchor">
                  <span>Verify Email Token</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={handleResendFromLogin}
              className="btn-secondary btn-block mt-3"
              disabled={resending || cooldown > 0}
            >
              {resending
                ? 'Sending...'
                : cooldown > 0
                ? `Resend available in ${cooldown}s`
                : 'Resend Verification Link'}
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form-body">
          <div className="auth-form-group">
            <label htmlFor="loginEmail" className="auth-field-label">
              Email or Username
            </label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="loginEmail"
                type="text"
                placeholder="name@example.com or Administrator"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                autoComplete="username"
                className="auth-text-input"
                required
              />
            </div>
          </div>

          <div className="auth-form-group">
            <div className="label-with-link">
              <label htmlFor="loginPassword" className="auth-field-label">
                Password
              </label>
            </div>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="loginPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="current-password"
                className="auth-text-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-password-toggle"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary-action btn-block auth-submit-btn"
            disabled={submitting}
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            {!submitting && <ArrowRight size={15} />}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="auth-card-footer">
          <p className="auth-redirect-text">
            Don't have an account?{' '}
            <Link to="/register" className="auth-text-link">
              Create an account
            </Link>
          </p>
        </div>

        {/* Development Quick-fill Credentials Box */}
        <div className="auth-demo-section">
          <div className="demo-header-row">
            <Sparkles size={13} />
            <span>QUICK-FILL DEMO CREDENTIALS</span>
          </div>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleQuickFill('verify_test_user@example.com', 'password123')}
            >
              <User size={13} />
              <span>Standard User</span>
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleQuickFill('Administrator', 'admin123')}
            >
              <Shield size={13} />
              <span>System Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
