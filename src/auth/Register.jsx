import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from './AuthContext';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Verification Pending Screen state
  const [registeredUser, setRegisteredUser] = useState(null);
  const [resendStatus, setResendStatus] = useState('');
  const [resendError, setResendError] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { register, resendVerification, isAuthenticated } = useAuth();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Please provide a valid email format (e.g. name@domain.com).';
    if (password.length < 6)
      return 'Password must contain at least 6 characters.';
    if (password !== confirmPassword) return 'The passwords entered do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const res = await register(
        fullName.trim(),
        email.trim().toLowerCase(),
        password
      );
      setRegisteredUser({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        emailSent: res?.email_sent,
        warning: res?.warning,
        devLink: res?.dev_link,
      });
      setCooldown(60);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!registeredUser?.email || cooldown > 0) return;
    setResendStatus('');
    setResendError('');
    try {
      setResending(true);
      const res = await resendVerification(registeredUser.email);
      setResendStatus(
        res?.message || 'Verification link sent! Please check your inbox.'
      );
      setCooldown(60);
      if (res?.dev_link) {
        setRegisteredUser((prev) => ({ ...prev, devLink: res.dev_link }));
      }
    } catch (err) {
      setResendError(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  // State: Verification Email Sent Screen
  if (registeredUser) {
    return (
      <div className="auth-viewport">
        <div className="auth-card-container">
          <div className="auth-verification-display">
            <div className="verification-icon-circle">
              <Mail size={28} />
            </div>

            <h2 className="auth-main-title">Check Your Inbox</h2>
            <p className="auth-sub-title">
              We have dispatched a verification link to confirm your account ownership:
            </p>

            <div className="auth-email-badge">
              <span>{registeredUser.email}</span>
            </div>

            <p className="auth-hint-text">
              Click the link inside the email to activate your account. You will be able to log in immediately once verified.
            </p>

            {/* Development Mode Helper for local test setup */}
            {registeredUser.devLink && (
              <div className="auth-dev-helper-box mt-4">
                <span className="dev-tag">Local Development Helper</span>
                <p className="dev-desc">
                  SMTP is not configured locally. Click below to simulate email confirmation directly:
                </p>
                <a
                  href={registeredUser.devLink}
                  className="dev-link-anchor"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Open Verification Link</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {resendStatus && (
              <div className="alert-banner alert-banner-success mt-3">
                <CheckCircle2 size={16} />
                <span>{resendStatus}</span>
              </div>
            )}

            {resendError && (
              <div className="alert-banner alert-banner-danger mt-3">
                <AlertCircle size={16} />
                <span>{resendError}</span>
              </div>
            )}

            <div className="verification-action-buttons mt-4">
              <button
                type="button"
                onClick={handleResend}
                className="btn-secondary btn-block"
                disabled={resending || cooldown > 0}
              >
                {resending
                  ? 'Sending...'
                  : cooldown > 0
                  ? `Resend link in ${cooldown}s`
                  : 'Resend Verification Email'}
              </button>

              <Link to="/login" className="btn-primary-action btn-block mt-2">
                <span>Proceed to Sign In</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State: Registration Form
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
          <h1 className="auth-main-title">Create an Account</h1>
          <p className="auth-sub-title">Start keeping notes with server-enforced private isolation</p>
        </div>

        {error && (
          <div className="alert-banner alert-banner-danger" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-body">
          <div className="auth-form-group">
            <label htmlFor="regName" className="auth-field-label">
              Full Name
            </label>
            <div className="auth-input-wrapper">
              <User size={16} className="auth-input-icon" />
              <input
                id="regName"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
                autoComplete="name"
                className="auth-text-input"
                required
              />
            </div>
          </div>

          <div className="auth-form-group">
            <label htmlFor="regEmail" className="auth-field-label">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="regEmail"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                autoComplete="email"
                className="auth-text-input"
                required
              />
            </div>
          </div>

          <div className="auth-form-group">
            <label htmlFor="regPassword" className="auth-field-label">
              Password
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="regPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="new-password"
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

          <div className="auth-form-group">
            <label htmlFor="regConfirmPassword" className="auth-field-label">
              Confirm Password
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="regConfirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                autoComplete="new-password"
                className="auth-text-input"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary-action btn-block auth-submit-btn"
            disabled={submitting}
          >
            <span>{submitting ? 'Creating Account...' : 'Get Started'}</span>
            {!submitting && <ArrowRight size={15} />}
          </button>
        </form>

        <div className="auth-card-footer">
          <p className="auth-redirect-text">
            Already have an account?{' '}
            <Link to="/login" className="auth-text-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
