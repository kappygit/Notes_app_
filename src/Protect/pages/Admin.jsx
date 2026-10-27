import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { formatFullDateTime, getInitials } from '../../utils/formatters';

export default function Admin() {
  const [frappeUsers, setFrappeUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(
          '/api/resource/User?filters=[["user_type","=","Website User"],["name","!=","Guest"]]&fields=["name","full_name","enabled","creation"]&limit_page_length=50&order_by=creation desc',
          {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setFrappeUsers(data.data || []);
        }
      } catch {
        // silently fallback
      } finally {
        setUsersLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return frappeUsers;
    const q = search.toLowerCase();
    return frappeUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  }, [frappeUsers, search]);

  const activeCount = frappeUsers.filter((u) => u.enabled).length;

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <header className="page-header-bar">
        <div className="header-meta">
          <div className="header-tag-pill">
            <Shield size={13} />
            <span>SUPERADMIN ACCESS</span>
          </div>
          <h1 className="page-title">User Accounts</h1>
          <p className="page-subtitle">
            Inspect and verify registered Frappe platform users and authentication states.
          </p>
        </div>

        <div className="header-action-group">
          <Link to="/admin/notes" className="btn-secondary">
            <FileText size={15} />
            <span>Audit System Notes</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="metrics-dashboard-grid mb-6">
        <div className="metric-card-link metric-card-static">
          <div className="metric-header-row">
            <span className="metric-title">Registered Users</span>
            <div className="metric-icon-box">
              <Users size={17} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-number">
              {usersLoading ? '—' : frappeUsers.length}
            </span>
            <span className="metric-sub-badge">Website Users</span>
          </div>
          <div className="metric-footer-row text-muted">
            <span>Synchronized with Frappe DocType</span>
          </div>
        </div>

        <div className="metric-card-link metric-card-static">
          <div className="metric-header-row">
            <span className="metric-title">Active Accounts</span>
            <div className="metric-icon-box metric-icon-secure">
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-number">
              {usersLoading ? '—' : activeCount}
            </span>
            <span className="metric-sub-badge badge-green">Enabled</span>
          </div>
          <div className="metric-footer-row text-muted">
            <span>Verified login permissions</span>
          </div>
        </div>

        <div className="metric-card-link metric-card-static">
          <div className="metric-header-row">
            <span className="metric-title">Backend Status</span>
            <div className="metric-icon-box metric-icon-accent">
              <Activity size={17} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-status">Operational</span>
          </div>
          <div className="metric-footer-row text-muted">
            <span>Proxy /api ↔ Frappe Port 8000</span>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="search-field-wrapper">
            <Search size={15} className="search-field-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-field-input"
            />
          </div>

          <div className="admin-table-count">
            {filteredUsers.length} of {frappeUsers.length} accounts
          </div>
        </div>

        <div className="admin-table-container">
          {usersLoading ? (
            <div className="admin-loading-state">
              <div className="spinner"></div>
              <p>Querying users from Frappe backend...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty-state">
              <Users size={32} />
              <p>No user accounts found matching your query.</p>
            </div>
          ) : (
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email Address</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const initials = getInitials(u.full_name || u.name);
                  return (
                    <tr key={u.name}>
                      <td className="user-name-cell">
                        <div className="table-avatar-circle">{initials}</div>
                        <span className="table-user-name">
                          {u.full_name || u.name}
                        </span>
                      </td>
                      <td>
                        <code className="table-code-pill">{u.name}</code>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            u.enabled ? 'status-pill-active' : 'status-pill-inactive'
                          }`}
                        >
                          {u.enabled ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          {u.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="table-date-cell">
                        {formatFullDateTime(u.creation)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
