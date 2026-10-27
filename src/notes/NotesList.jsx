import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Grid,
  List as ListIcon,
  Star,
  Clock,
  Trash2,
  Edit3,
  Eye,
  X,
  Copy,
  Check,
  FileText,
  AlertCircle,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { notesApi } from '../Apihelper/notesApi';
import { formatNoteDate, formatFullDateTime, getNoteStats } from '../utils/formatters';
import { getFavorites, toggleFavorite } from '../utils/favorites';

export default function NotesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('filter') === 'favorites' ? 'favorites' : 'all';

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Favorites state
  const [favorites, setFavorites] = useState(getFavorites());

  // View mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('kappy_view_mode') || 'grid';
  });

  // Sort order: 'modified_desc', 'modified_asc', 'title_asc'
  const [sortBy, setSortBy] = useState('modified_desc');

  // Selected note for Reader Modal
  const [activeNote, setActiveNote] = useState(null);
  const [copied, setCopied] = useState(false);

  // Note for Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('kappy_view_mode', mode);
  };

  // Fetch user notes
  useEffect(() => {
    let active = true;
    notesApi
      .getUserNotes(search)
      .then((data) => {
        if (active) {
          setNotes(Array.isArray(data) ? data : []);
          setError('');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load notes. Please verify your connection.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [search, refreshKey]);

  // Toggle favorite
  const handleToggleFavorite = (noteId, e) => {
    e.stopPropagation();
    const updated = toggleFavorite(noteId);
    setFavorites([...updated]);
  };

  // Keyboard shortcut Ctrl+N / Cmd+N
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/notes/new');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Delete note action
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await notesApi.deleteNote(deleteTarget.name);
      setSuccess(`Note "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      setNotes((prev) => prev.filter((n) => n.name !== deleteTarget.name));
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete note.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyContent = () => {
    if (!activeNote) return;
    const textToCopy = `${activeNote.title}\n\n${activeNote.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered & sorted notes
  const displayedNotes = useMemo(() => {
    let result = [...notes];

    if (activeTab === 'favorites') {
      result = result.filter((n) => favorites.includes(n.name));
    }

    result.sort((a, b) => {
      if (sortBy === 'modified_desc') {
        return new Date(b.modified || 0) - new Date(a.modified || 0);
      }
      if (sortBy === 'modified_asc') {
        return new Date(a.modified || 0) - new Date(b.modified || 0);
      }
      if (sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return result;
  }, [notes, activeTab, favorites, sortBy]);

  return (
    <div className="notes-view-container">
      {/* Top Header Bar */}
      <header className="page-header-bar">
        <div className="header-meta">
          <h1 className="page-title">
            {activeTab === 'favorites' ? 'Favorite Notes' : 'All Notes'}
          </h1>
          <p className="page-subtitle">
            {activeTab === 'favorites'
              ? 'Your pinned and highlighted personal documents'
              : 'Server-isolated, end-to-end authenticated private notes'}
          </p>
        </div>

        <div className="header-action-group">
          <Link to="/notes/new" className="btn-primary-action">
            <Plus size={16} strokeWidth={2.4} />
            <span>New Note</span>
          </Link>
        </div>
      </header>

      {/* Global Feedback Banners */}
      {error && (
        <div className="alert-banner alert-banner-danger" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="alert-close-btn" aria-label="Close error">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="alert-banner alert-banner-success" role="status">
          <Check size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="alert-close-btn" aria-label="Close notification">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter, Search & View Controls Bar */}
      <div className="notes-controls-panel">
        {/* Tabs: All vs Favorites */}
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setSearchParams({})}
          >
            All Notes
            <span className="pill-count">{notes.length}</span>
          </button>
          <button
            type="button"
            className={`filter-pill ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setSearchParams({ filter: 'favorites' })}
          >
            <Star size={13} className="pill-icon" />
            Favorites
            <span className="pill-count">
              {notes.filter((n) => favorites.includes(n.name)).length}
            </span>
          </button>
        </div>

        <div className="controls-right-side">
          {/* Search Input Box */}
          <div className="search-field-wrapper">
            <Search size={15} className="search-field-icon" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-field-input"
              aria-label="Search notes"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="search-field-clear"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="sort-dropdown-container">
            <ArrowUpDown size={14} className="sort-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
              aria-label="Sort notes"
            >
              <option value="modified_desc">Recently Updated</option>
              <option value="modified_asc">Oldest Updated</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle: Grid vs List */}
          <div className="view-mode-toggle-group">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('grid')}
              title="Grid view"
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('list')}
              title="List view"
              aria-label="List view"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Notes Content Display */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'notes-grid-skeleton' : 'notes-list-table-container'}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-note-card">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-text"></div>
              <div className="skeleton-line skeleton-text short"></div>
              <div className="skeleton-line skeleton-footer"></div>
            </div>
          ))}
        </div>
      ) : displayedNotes.length === 0 ? (
        /* Professional Empty States */
        <div className="notes-empty-state-card">
          <div className="empty-state-illustration">
            <FileText size={36} strokeWidth={1.5} />
          </div>
          <h3 className="empty-state-title">
            {search
              ? 'No matching notes found'
              : activeTab === 'favorites'
              ? 'No favorite notes yet'
              : 'No notes created yet'}
          </h3>
          <p className="empty-state-desc">
            {search
              ? `No notes match "${search}". Try adjusting your keywords.`
              : activeTab === 'favorites'
              ? 'Mark your most critical notes with a star to access them quickly here.'
              : 'Capture your thoughts, ideas, plans, and snippets with server-level isolation.'}
          </p>

          <div className="empty-state-actions">
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="btn-secondary"
              >
                Clear Search Filter
              </button>
            ) : activeTab === 'favorites' ? (
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="btn-secondary"
              >
                View All Notes
              </button>
            ) : (
              <Link to="/notes/new" className="btn-primary-action">
                <Plus size={16} />
                <span>Create Your First Note</span>
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View Layout */
        <div className="notes-card-grid">
          {displayedNotes.map((note) => {
            const isFav = favorites.includes(note.name);
            const stats = getNoteStats(note.content);
            return (
              <article
                key={note.name}
                className={`note-preview-card ${isFav ? 'is-favorite' : ''}`}
                onClick={() => setActiveNote(note)}
              >
                {/* Card Header */}
                <div className="card-top-row">
                  <h3 className="note-card-heading" title={note.title}>
                    {note.title}
                  </h3>
                  <button
                    type="button"
                    className={`note-favorite-star ${isFav ? 'starred' : ''}`}
                    onClick={(e) => handleToggleFavorite(note.name, e)}
                    title={isFav ? 'Remove from favorites' : 'Mark as favorite'}
                    aria-label="Toggle favorite"
                  >
                    <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Card Content Snippet */}
                <p className="note-snippet-text">
                  {note.content || 'Empty note...'}
                </p>

                {/* Card Footer Metadata & Actions */}
                <div className="card-bottom-row" onClick={(e) => e.stopPropagation()}>
                  <div className="note-meta-badges">
                    <span className="meta-time-badge" title={`Updated: ${formatFullDateTime(note.modified)}`}>
                      <Clock size={12} />
                      {formatNoteDate(note.modified)}
                    </span>
                    <span className="meta-word-count">
                      {stats.words} {stats.words === 1 ? 'word' : 'words'}
                    </span>
                  </div>

                  <div className="card-action-bar">
                    <button
                      type="button"
                      onClick={() => setActiveNote(note)}
                      className="card-mini-btn"
                      title="Read full note"
                      aria-label="View note"
                    >
                      <Eye size={14} />
                    </button>
                    <Link
                      to={`/notes/${note.name}/edit`}
                      className="card-mini-btn"
                      title="Edit note"
                      aria-label="Edit note"
                    >
                      <Edit3 size={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(note)}
                      className="card-mini-btn card-mini-btn-danger"
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* List View Layout */
        <div className="notes-list-table-container">
          <table className="notes-tabular-view">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Title</th>
                <th>Preview</th>
                <th>Word Count</th>
                <th>Last Modified</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedNotes.map((note) => {
                const isFav = favorites.includes(note.name);
                const stats = getNoteStats(note.content);
                return (
                  <tr
                    key={note.name}
                    className="tabular-note-row"
                    onClick={() => setActiveNote(note)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`note-favorite-star ${isFav ? 'starred' : ''}`}
                        onClick={(e) => handleToggleFavorite(note.name, e)}
                        title={isFav ? 'Remove favorite' : 'Mark favorite'}
                      >
                        <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="row-title-cell">
                      <span className="row-note-title">{note.title}</span>
                    </td>
                    <td className="row-preview-cell">
                      <span className="row-note-snippet">{note.content}</span>
                    </td>
                    <td className="row-stats-cell">
                      <span className="row-stats-tag">{stats.words} words</span>
                    </td>
                    <td className="row-date-cell">
                      {formatNoteDate(note.modified)}
                    </td>
                    <td className="row-actions-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="card-action-bar">
                        <button
                          type="button"
                          onClick={() => setActiveNote(note)}
                          className="card-mini-btn"
                          title="Read note"
                        >
                          <Eye size={14} />
                        </button>
                        <Link
                          to={`/notes/${note.name}/edit`}
                          className="card-mini-btn"
                          title="Edit note"
                        >
                          <Edit3 size={14} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(note)}
                          className="card-mini-btn card-mini-btn-danger"
                          title="Delete note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ───── Modal 1: Note Reader Modal ───── */}
      {activeNote && (
        <div className="modal-backdrop-scrim" onClick={() => setActiveNote(null)}>
          <div
            className="modal-panel-card note-reader-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="modal-panel-header">
              <div className="reader-title-area">
                <span className="reader-type-tag">
                  <BookOpen size={13} />
                  Private Document
                </span>
                <h2 className="reader-modal-title">{activeNote.title}</h2>
              </div>
              <div className="reader-header-actions">
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="modal-tool-btn"
                  title="Copy full content"
                >
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <Link
                  to={`/notes/${activeNote.name}/edit`}
                  className="modal-tool-btn modal-tool-btn-primary"
                  onClick={() => setActiveNote(null)}
                >
                  <Edit3 size={15} />
                  <span>Edit</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveNote(null)}
                  className="modal-close-icon-btn"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="reader-metadata-strip">
              <div className="meta-strip-item">
                <span className="meta-strip-label">Owner</span>
                <span className="meta-strip-value">{activeNote.note_user}</span>
              </div>
              <div className="meta-strip-item">
                <span className="meta-strip-label">Last Modified</span>
                <span className="meta-strip-value">{formatFullDateTime(activeNote.modified)}</span>
              </div>
              <div className="meta-strip-item">
                <span className="meta-strip-label">Length</span>
                <span className="meta-strip-value">
                  {getNoteStats(activeNote.content).words} words · {getNoteStats(activeNote.content).readingTime}
                </span>
              </div>
            </div>

            {/* Note Body */}
            <div className="reader-modal-body">
              <div className="reader-prose-content">
                {activeNote.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-panel-footer">
              <span className="reader-footer-id">ID: #{activeNote.name}</span>
              <button
                type="button"
                onClick={() => setActiveNote(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── Modal 2: Delete Confirmation Modal ───── */}
      {deleteTarget && (
        <div
          className="modal-backdrop-scrim"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="modal-panel-card delete-dialog-panel"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="delete-dialog-header">
              <div className="delete-warning-icon-box">
                <Trash2 size={20} />
              </div>
              <div className="delete-dialog-text">
                <h3 className="delete-dialog-title">Delete Note</h3>
                <p className="delete-dialog-desc">
                  Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="delete-dialog-footer">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn-danger-action"
                disabled={deleting}
              >
                {deleting ? 'Deleting Note...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
