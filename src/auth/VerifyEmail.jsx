import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
} from 'lucide-react';
import { useAuth } from './AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { verifyEmail, resendVerification, isAuthenticated } = useAuth();

  const [status, setStatus] = useState(() => (token ? 'verifying' : 'error'));
  const [message, setMessage] = useState(() =>
    token
      ? ''
      : 'No verification token provided in URL. Please click the link received in your email.'
  );
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Resend form state for when token has expired/invalid
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const verificationAttempted = useRef(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Cooldown timer ticker
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Verify on mount
  useEffect(() => {
    if (!token || verificationAttempted.current) return;
    verificationAttempted.current = true;

    verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(
          res?.message || 'Email verified successfully. You can now log in.'
        );
        if (res?.email) setVerifiedEmail(res.email);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.message || 'Verification failed. The link may be invalid or expired.'
        );
      });
  }, [token, verifyEmail]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendErr('');
    setResendMsg('');

    if (!resendEmail.trim()) {
      setResendErr('Please enter your registered email address.');
      return;
    }

    try {
      setResending(true);
      const res = await resendVerification(resendEmail.trim());
      setResendMsg(res?.message || 'Verification email sent! Please check your inbox.');
      setCooldown(60);
    } catch (err) {
      setResendErr(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-viewport">
      <div className="auth-card-container">
        {/* State 1: Verifying */}
        {status === 'verifying' && (
          <div className="auth-verification-display">
            <div className="spinner"></div>
            <h2 className="auth-state-heading mt-3">Validating Token...</h2>
            <p className="auth-sub-title">
              Please wait while we confirm your email token with the server.
            </p>
          </div>
        )}

        {/* State 2: Success */}
        {status === 'success' && (
          <div className="auth-verification-display">
            <div className="verification-icon-circle success">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="auth-state-heading">Email Verified!</h2>
            <p className="auth-sub-title">
              {message || 'Your email address has been confirmed and your account is active.'}
            </p>
            {verifiedEmail && (
              <div className="auth-email-badge">
                <span>{verifiedEmail}</span>
              </div>
            )}
            <Link to="/login" className="btn-primary-action btn-block mt-4">
              <span>Sign In to Your Workspace</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* State 3: Error */}
        {status === 'error' && (
          <div className="auth-verification-display">
            <div className="verification-icon-circle danger">
              <AlertCircle size={28} />
            </div>
            <h2 className="auth-state-heading">Verification Failed</h2>
            <p className="auth-sub-title text-danger">
              {message}
            </p>

            {/* Resend box */}
            <div className="auth-resend-form-box mt-4">
              <h4 className="resend-box-title">Request a New Verification Link</h4>
              <p className="resend-box-subtitle">
                Enter your email address to receive a fresh verification link:
              </p>

              {resendMsg && (
                <div className="alert-banner alert-banner-success mt-2">
                  <CheckCircle2 size={15} />
                  <span>{resendMsg}</span>
                </div>
              )}
              {resendErr && (
                <div className="alert-banner alert-banner-danger mt-2">
                  <AlertCircle size={15} />
                  <span>{resendErr}</span>
                </div>
              )}

              <form onSubmit={handleResend} className="resend-form-group mt-3">
                <div className="auth-input-wrapper">
                  <Mail size={15} className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={resending || cooldown > 0}
                    className="auth-text-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary-action btn-block mt-2"
                  disabled={resending || cooldown > 0}
                >
                  {resending
                    ? 'Sending...'
                    : cooldown > 0
                    ? `Wait (${cooldown}s)`
                    : 'Send Verification Link'}
                </button>
              </form>
            </div>

            <div className="auth-card-footer mt-4">
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={14} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
