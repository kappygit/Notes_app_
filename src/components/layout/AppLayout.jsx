import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Star,
  LayoutDashboard,
  Plus,
  Users,
  LogOut,
  Menu,
  X,
  PenLine,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getInitials } from '../../utils/formatters';
import { getFavorites } from '../../utils/favorites';
import { notesApi } from '../../Apihelper/notesApi';

export default function AppLayout() {
  const { user, fullName, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [totalNotes, setTotalNotes] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(() => getFavorites().length);

  const closeMobile = () => setMobileOpen(false);

  // Load note counts for badge display
  useEffect(() => {
    let mounted = true;
    notesApi
      .getUserNotes()
      .then((notes) => {
        if (mounted && Array.isArray(notes)) {
          setTotalNotes(notes.length);
          const favs = getFavorites();
          const validFavs = notes.filter((n) => favs.includes(n.name)).length;
          setFavoritesCount(validFavs || favs.length);
        }
      })
      .catch(() => {
        // Soft fail
      });

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.warn('Logout failed:', err);
    }
  };

  // Compute breadcrumb title
  const getBreadcrumb = () => {
    const { pathname, search } = location;
    if (pathname === '/dashboard') return { title: 'Dashboard', root: 'Workspace' };
    if (pathname === '/notes') {
      if (search.includes('filter=favorites')) {
        return { title: 'Favorites', root: 'Notes' };
      }
      return { title: 'All Notes', root: 'Workspace' };
    }
    if (pathname === '/notes/new') return { title: 'New Note', root: 'Notes' };
    if (pathname.includes('/edit')) return { title: 'Edit Note', root: 'Notes' };
    if (pathname === '/admin') return { title: 'Website Users', root: 'Admin Console' };
    if (pathname === '/admin/notes') return { title: 'All Notes Audit', root: 'Admin Console' };
    return { title: 'Workspace', root: 'Home' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent / Responsive Sidebar */}
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-wrapper">
          <Link to="/dashboard" className="sidebar-brand" onClick={closeMobile}>
            <div className="brand-icon-box">
              <PenLine size={18} strokeWidth={2.4} />
            </div>
            <div className="brand-meta">
              <span className="brand-title">Kappy Notes</span>
              <span className="brand-subtitle">Workspace</span>
            </div>
          </Link>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={closeMobile}
            aria-label="Close sidebar navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="sidebar-action-container">
          <Link to="/notes/new" className="sidebar-new-note-btn" onClick={closeMobile}>
            <Plus size={16} strokeWidth={2.5} />
            <span>New Note</span>
            <span className="sidebar-shortcut-hint">Ctrl+N</span>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav">
          <div className="nav-group-label">WORKSPACE</div>
          <ul className="nav-list">
            <li>
              <NavLink
                to="/dashboard"
                onClick={closeMobile}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <LayoutDashboard size={16} className="nav-icon" />
                <span className="nav-label">Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/notes"
                end
                onClick={closeMobile}
                className={() => {
                  const isAllNotes =
                    location.pathname === '/notes' &&
                    !location.search.includes('filter=favorites');
                  return `nav-item ${isAllNotes ? 'active' : ''}`;
                }}
              >
                <FileText size={16} className="nav-icon" />
                <span className="nav-label">All Notes</span>
                {totalNotes > 0 && (
                  <span className="nav-badge">{totalNotes}</span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/notes?filter=favorites"
                onClick={closeMobile}
                className={() => {
                  const isFavs =
                    location.pathname === '/notes' &&
                    location.search.includes('filter=favorites');
                  return `nav-item ${isFavs ? 'active' : ''}`;
                }}
              >
                <Star size={16} className="nav-icon" />
                <span className="nav-label">Favorites</span>
                {favoritesCount > 0 && (
                  <span className="nav-badge nav-badge-subtle">
                    {favoritesCount}
                  </span>
                )}
              </NavLink>
            </li>
          </ul>

          {/* Admin Navigation (Only visible for Administrator / System Manager) */}
          {isAdmin && (
            <div className="nav-admin-section">
              <div className="nav-group-label nav-group-label-admin">
                <span>ADMINISTRATION</span>
                <span className="admin-pill">FRAFFE</span>
              </div>
              <ul className="nav-list">
                <li>
                  <NavLink
                    to="/admin"
                    end
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <Users size={16} className="nav-icon" />
                    <span className="nav-label">Website Users</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/notes"
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <ShieldCheck size={16} className="nav-icon" />
                    <span className="nav-label">Notes Audit</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* Sidebar Footer with Live Session & Profile */}
        <div className="sidebar-footer">
          <div className="session-status-tag" title="Connected to Frappe Session">
            <span className="status-indicator-dot" />
            <span>Active Session</span>
          </div>

          <div className="user-profile-tile">
            <div className="user-avatar-circle">
              {getInitials(fullName || user || 'User')}
            </div>
            <div className="user-meta-info">
              <div className="user-primary-name" title={fullName || user}>
                {fullName || user || 'Member'}
              </div>
              <div className="user-role-label">
                {isAdmin ? 'System Manager' : 'Member'}
              </div>
            </div>
            <button
              type="button"
              className="user-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        {/* Topbar with Breadcrumbs & Mobile Trigger */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu size={18} />
            </button>
            <div className="topbar-breadcrumb">
              <span className="breadcrumb-root">{breadcrumb.root}</span>
              <ChevronRight size={13} className="breadcrumb-sep" />
              <span className="breadcrumb-current">{breadcrumb.title}</span>
            </div>
          </div>

          <div className="topbar-right">
            {location.pathname !== '/notes/new' && (
              <Link to="/notes/new" className="topbar-action-btn">
                <Plus size={14} strokeWidth={2.5} />
                <span>New Note</span>
              </Link>
            )}
          </div>
        </header>

        {/* Content Outlet */}
        <main className="app-content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
