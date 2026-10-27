import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import AppLayout from '../components/layout/AppLayout';

export default function ProtectedRoutes({ requiredRole }) {
  const { user, roles, isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-viewport">
        <div className="auth-loading-box">
          <div className="spinner"></div>
          <p className="loading-caption">Verifying protected session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access check
  if (requiredRole === 'admin' && !isAdmin) {
    return (
      <div className="auth-viewport">
        <div className="auth-card-container unauthorized-card-container">
          <div className="unauthorized-icon-badge">
            <ShieldAlert size={28} />
          </div>
          <h2 className="auth-main-title">Access Restricted</h2>
          <p className="auth-sub-title">
            You are logged in as <strong>{user}</strong>, but this zone requires elevated <strong>Administrator</strong> privileges.
          </p>
          <div className="unauthorized-roles-pill">
            <span>Your Active Roles: {roles.filter((r) => r !== 'All').join(', ') || 'Standard Member'}</span>
          </div>
          <div className="mt-4">
            <Link to="/dashboard" className="btn-primary-action btn-block">
              <ArrowLeft size={15} />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (requiredRole && requiredRole !== 'admin' && !roles.includes(requiredRole)) {
    return (
      <div className="auth-viewport">
        <div className="auth-card-container unauthorized-card-container">
          <div className="unauthorized-icon-badge">
            <ShieldAlert size={28} />
          </div>
          <h2 className="auth-main-title">Role Required</h2>
          <p className="auth-sub-title">
            This workspace requires the <strong>{requiredRole}</strong> permission role.
          </p>
          <div className="mt-4">
            <Link to="/dashboard" className="btn-primary-action btn-block">
              <ArrowLeft size={15} />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AppLayout />;
}
