import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  FileText,
  User,
  Copy,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { notesApi } from '../../Apihelper/notesApi';
import { formatFullDateTime, formatNoteDate, getNoteStats } from '../../utils/formatters';

export default function AdminNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [error, setError] = useState('');
  const [activeNote, setActiveNote] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    notesApi
      .getAllNotes(search, userFilter)
      .then((data) => {
        if (!ignore) {
          setNotes(Array.isArray(data) ? data : []);
          setError('');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err.message ||
              'Failed to load system notes. Ensure your account possesses Administrator privileges.'
          );
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search, userFilter]);

  // Unique note owners
  const uniqueOwners = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => {
      if (n.note_user) set.add(n.note_user);
    });
    return Array.from(set);
  }, [notes]);

  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(`${activeNote.title}\n\n${activeNote.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <header className="page-header-bar">
        <div className="header-meta">
          <div className="header-tag-pill">
            <ShieldCheck size={13} />
            <span>SUPERADMIN ACCESS</span>
          </div>
          <h1 className="page-title">System-Wide Notes</h1>
          <p className="page-subtitle">
            Super-admin audit log: Read-only access to inspect all user notes across the Frappe instance.
          </p>
        </div>
      </header>

      {error && (
        <div className="alert-banner alert-banner-danger" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar: Search, Filter & Counts */}
      <div className="notes-controls-panel">
        <div className="search-field-wrapper">
          <Search size={15} className="search-field-icon" />
          <input
            type="text"
            placeholder="Search by title, snippet, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-field-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="search-field-clear"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="controls-right-side">
          <div className="sort-dropdown-container">
            <Filter size={14} className="sort-icon" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="sort-select"
              aria-label="Filter by owner"
            >
              <option value="">All Note Owners ({uniqueOwners.length})</option>
              {uniqueOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>

          <div className="table-count-badge">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </div>
        </div>
      </div>

      {/* Table of System Notes */}
      <div className="admin-table-panel">
        <div className="admin-table-container">
          {loading ? (
            <div className="admin-loading-state">
              <div className="spinner"></div>
              <p>Querying notes across all tenant users...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="admin-empty-state">
              <FileText size={32} />
              <p>No notes found matching your criteria.</p>
            </div>
          ) : (
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Owner</th>
                  <th>Content Preview</th>
                  <th>Last Modified</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr
                    key={note.name}
                    onClick={() => setActiveNote(note)}
                    className="clickable-table-row"
                  >
                    <td className="note-title-cell">
                      <span className="table-note-heading">{note.title}</span>
                      <span className="table-id-tag">#{note.name.slice(0, 8)}</span>
                    </td>
                    <td>
                      <span className="owner-badge">
                        <User size={12} />
                        {note.note_user}
                      </span>
                    </td>
                    <td className="table-preview-cell">
                      <span className="table-preview-text">
                        {note.content}
                      </span>
                    </td>
                    <td className="table-date-cell">
                      {formatNoteDate(note.modified)}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setActiveNote(note)}
                        className="btn-secondary btn-sm"
                        title="View Full Note"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Admin Note Reader Modal */}
      {activeNote && (
        <div className="modal-backdrop-scrim" onClick={() => setActiveNote(null)}>
          <div
            className="modal-panel-card note-reader-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-panel-header">
              <div className="reader-title-area">
                <span className="reader-type-tag">
                  <ShieldCheck size={13} />
                  System Note Inspection
                </span>
                <h2 className="reader-modal-title">{activeNote.title}</h2>
              </div>
              <div className="reader-header-actions">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="modal-tool-btn"
                >
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNote(null)}
                  className="modal-close-icon-btn"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="reader-metadata-strip">
              <div className="meta-strip-item">
                <span className="meta-strip-label">Owner</span>
                <span className="meta-strip-value">{activeNote.note_user}</span>
              </div>
              <div className="meta-strip-item">
                <span className="meta-strip-label">Created</span>
                <span className="meta-strip-value">{formatFullDateTime(activeNote.creation)}</span>
              </div>
              <div className="meta-strip-item">
                <span className="meta-strip-label">Modified</span>
                <span className="meta-strip-value">{formatFullDateTime(activeNote.modified)}</span>
              </div>
              <div className="meta-strip-item">
                <span className="meta-strip-label">Stats</span>
                <span className="meta-strip-value">
                  {getNoteStats(activeNote.content).words} words · {getNoteStats(activeNote.content).readingTime}
                </span>
              </div>
            </div>

            <div className="reader-modal-body">
              <div className="reader-prose-content">
                {activeNote.content}
              </div>
            </div>

            <div className="modal-panel-footer">
              <span className="reader-footer-id">Note UID: {activeNote.name}</span>
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
    </div>
  );
}
