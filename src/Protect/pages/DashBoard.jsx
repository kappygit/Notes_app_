import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Star,
  Clock,
  Shield,
  Users,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { notesApi } from '../../Apihelper/notesApi';
import { formatNoteDate, getNoteStats } from '../../utils/formatters';
import { getFavorites } from '../../utils/favorites';

export default function DashBoard() {
  const { user, fullName, roles, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [notesCount, setNotesCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    notesApi
      .getUserNotes()
      .then((notes) => {
        if (mounted && Array.isArray(notes)) {
          setNotesCount(notes.length);
          const sorted = [...notes].sort(
            (a, b) => new Date(b.modified || 0) - new Date(a.modified || 0)
          );
          setRecentNotes(sorted.slice(0, 4));

          const favs = getFavorites();
          setFavoritesCount(notes.filter((n) => favs.includes(n.name)).length);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = fullName || user || 'there';

  return (
    <div className="dashboard-view-container">
      {/* Top Welcome Banner */}
      <div className="dashboard-welcome-card">
        <div className="welcome-text-side">
          <div className="welcome-pill-status">
            <span className="welcome-status-dot"></span>
            <span>Session Authenticated & Protected</span>
          </div>
          <h1 className="welcome-heading">
            {getGreeting()}, {displayName}
          </h1>
          <p className="welcome-subtext">
            Your personal workspace is synchronized with backend-level ownership and encrypted session authentication.
          </p>
        </div>

        <div className="welcome-actions-side">
          <Link to="/notes/new" className="btn-primary-action">
            <Plus size={16} strokeWidth={2.4} />
            <span>Create Note</span>
          </Link>
          <Link to="/notes" className="btn-secondary">
            <FileText size={15} />
            <span>All Notes</span>
          </Link>
        </div>
      </div>

      {/* Workspace Metrics Grid */}
      <div className="metrics-dashboard-grid">
        <Link to="/notes" className="metric-card-link">
          <div className="metric-header-row">
            <span className="metric-title">Total Notes</span>
            <div className="metric-icon-box">
              <FileText size={17} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-number">
              {loading ? '—' : notesCount}
            </span>
            <span className="metric-sub-badge">Private</span>
          </div>
          <div className="metric-footer-row">
            <span>View all personal notes</span>
            <ChevronRight size={14} />
          </div>
        </Link>

        <Link to="/notes?filter=favorites" className="metric-card-link">
          <div className="metric-header-row">
            <span className="metric-title">Favorites</span>
            <div className="metric-icon-box metric-icon-accent">
              <Star size={17} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-number">
              {loading ? '—' : favoritesCount}
            </span>
            <span className="metric-sub-badge">Pinned</span>
          </div>
          <div className="metric-footer-row">
            <span>View bookmarked notes</span>
            <ChevronRight size={14} />
          </div>
        </Link>

        <div className="metric-card-link metric-card-static">
          <div className="metric-header-row">
            <span className="metric-title">Backend Security</span>
            <div className="metric-icon-box metric-icon-secure">
              <Shield size={17} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-status">Enforced</span>
            <span className="metric-sub-badge badge-green">Frappe</span>
          </div>
          <div className="metric-footer-row text-muted">
            <span>Ownership verified at server level</span>
          </div>
        </div>

        <div className="metric-card-link metric-card-static">
          <div className="metric-header-row">
            <span className="metric-title">Access Role</span>
            <div className="metric-icon-box">
              <Users size={17} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-role">
              {isAdmin ? 'Administrator' : 'Standard Member'}
            </span>
          </div>
          <div className="metric-footer-row text-muted">
            <span>{roles.filter((r) => r !== 'All' && r !== 'Guest').join(', ') || 'Website User'}</span>
          </div>
        </div>
      </div>

      {/* Recent Notes Section */}
      <section className="dashboard-recent-section">
        <div className="section-title-bar">
          <div>
            <h2 className="section-title">Recent Notes</h2>
            <p className="section-subtitle">
              Quickly jump back into what you were working on
            </p>
          </div>
          <Link to="/notes" className="section-view-all-link">
            <span>Browse All Notes</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="recent-notes-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-note-card">
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-line skeleton-text"></div>
                <div className="skeleton-line skeleton-footer"></div>
              </div>
            ))}
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="dashboard-empty-notes-card">
            <div className="empty-icon-circle">
              <FileText size={24} />
            </div>
            <h3>No notes yet</h3>
            <p>Capture your ideas, memos, and checklists with clean formatting.</p>
            <Link to="/notes/new" className="btn-primary-action">
              <Plus size={16} />
              <span>Create Note</span>
            </Link>
          </div>
        ) : (
          <div className="recent-notes-grid">
            {recentNotes.map((note) => {
              const stats = getNoteStats(note.content);
              return (
                <article
                  key={note.name}
                  className="recent-note-tile"
                  onClick={() => navigate(`/notes/${note.name}/edit`)}
                >
                  <div className="recent-tile-header">
                    <h3 className="recent-tile-title">{note.title}</h3>
                    <span className="recent-tile-time">
                      <Clock size={12} />
                      {formatNoteDate(note.modified)}
                    </span>
                  </div>

                  <p className="recent-tile-snippet">
                    {note.content || 'No additional content...'}
                  </p>

                  <div className="recent-tile-footer">
                    <span className="recent-tile-words">
                      {stats.words} words
                    </span>
                    <span className="recent-tile-edit-link">
                      Edit note →
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Admin Shortcut Banner (if admin) */}
      {isAdmin && (
        <div className="dashboard-admin-banner">
          <div className="admin-banner-info">
            <div className="admin-banner-badge">
              <ShieldCheck size={14} />
              <span>ADMINISTRATOR CONSOLE</span>
            </div>
            <h3 className="admin-banner-title">
              Platform Administration Privileges Active
            </h3>
            <p className="admin-banner-desc">
              You have elevated permissions to inspect registered accounts, view system-wide notes, and monitor system security.
            </p>
          </div>

          <div className="admin-banner-buttons">
            <Link to="/admin" className="btn-secondary">
              <Users size={15} />
              <span>User Accounts</span>
            </Link>
            <Link to="/admin/notes" className="btn-secondary">
              <ShieldCheck size={15} />
              <span>System Notes</span>
            </Link>
          </div>
        </div>
      )}

      {/* Productivity Shortcuts Card */}
      <div className="dashboard-shortcuts-panel">
        <div className="shortcuts-header">
          <Command size={16} />
          <h4>Keyboard Shortcuts</h4>
        </div>
        <div className="shortcuts-grid">
          <div className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>N</kbd>
            <span>Create New Note</span>
          </div>
          <div className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
            <span>Save Changes</span>
          </div>
          <div className="shortcut-item">
            <kbd>Esc</kbd>
            <span>Close Viewers / Modals</span>
          </div>
        </div>
      </div>
    </div>
  );
}
