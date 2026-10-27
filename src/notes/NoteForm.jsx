import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  User,
  Shield,
  Lock,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { notesApi } from '../Apihelper/notesApi';
import { formatFullDateTime, getNoteStats } from '../utils/formatters';

export default function NoteForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteOwner, setNoteOwner] = useState(user || '');
  const [timestamps, setTimestamps] = useState(null);

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  // Unsaved changes tracking
  const [hasChanges, setHasChanges] = useState(false);
  const initialDataRef = useRef({ title: '', content: '' });

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load note if editing
  useEffect(() => {
    if (!isEditing) return;

    let mounted = true;
    const loadNote = async () => {
      try {
        setLoading(true);
        setError('');
        const note = await notesApi.getNote(id);
        if (mounted && note) {
          setTitle(note.title || '');
          setContent(note.content || '');
          setNoteOwner(note.note_user || user || '');
          setTimestamps({
            creation: note.creation,
            modified: note.modified,
          });
          initialDataRef.current = {
            title: note.title || '',
            content: note.content || '',
          };
          setHasChanges(false);
        }
      } catch (err) {
        if (mounted) {
          const msg = err.message || 'Unable to load note.';
          setError(msg);
          if (
            msg.toLowerCase().includes('permission') ||
            msg.toLowerCase().includes('denied') ||
            msg.toLowerCase().includes('403')
          ) {
            setAccessDenied(true);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadNote();
    return () => {
      mounted = false;
    };
  }, [id, isEditing, user]);

  const handleTitleChange = (val) => {
    setTitle(val);
    setHasChanges(
      val !== initialDataRef.current.title ||
        content !== initialDataRef.current.content
    );
  };

  const handleContentChange = (val) => {
    setContent(val);
    setHasChanges(
      title !== initialDataRef.current.title ||
        val !== initialDataRef.current.content
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Please provide a title for your note.');
      return;
    }

    if (!content.trim()) {
      setError('Note content cannot be completely empty.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await notesApi.updateNote(id, title.trim(), content.trim());
        setSuccess('Changes saved successfully.');
        initialDataRef.current = { title: title.trim(), content: content.trim() };
        setHasChanges(false);
      } else {
        await notesApi.createNote(title.trim(), content.trim());
        setSuccess('Note created successfully.');
        initialDataRef.current = { title: title.trim(), content: content.trim() };
        setHasChanges(false);
        setTimeout(() => {
          navigate('/notes');
        }, 600);
      }
    } catch (err) {
      setError(err.message || 'Failed to save note. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleDeleteNote = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await notesApi.deleteNote(id);
      navigate('/notes');
    } catch (err) {
      setError(err.message || 'Failed to delete note.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const stats = getNoteStats(content);

  return (
    <div className="editor-shell-container">
      {/* Editor Top Control Bar */}
      <header className="editor-header-bar">
        <div className="editor-nav-left">
          <Link to="/notes" className="editor-back-btn" title="Back to Notes">
            <ArrowLeft size={16} />
            <span>Notes</span>
          </Link>

          <span className="editor-breadcrumb-separator">/</span>

          <span className="editor-current-doc">
            {isEditing ? title || 'Untitled Note' : 'New Note'}
          </span>
        </div>

        <div className="editor-actions-right">
          {/* Status indicator */}
          <div className="editor-save-state">
            {submitting ? (
              <span className="state-badge saving">Saving...</span>
            ) : hasChanges ? (
              <span className="state-badge unsaved">Unsaved changes</span>
            ) : isEditing ? (
              <span className="state-badge saved">
                <Check size={13} />
                Saved
              </span>
            ) : null}
          </div>

          {/* Note Stats Badge */}
          <div className="editor-word-stats">
            <span>{stats.words} words</span>
            <span className="stats-dot">·</span>
            <span>{stats.characters} chars</span>
          </div>

          {/* Delete button (if editing) */}
          {isEditing && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="editor-icon-btn editor-icon-btn-danger"
              title="Delete note"
              aria-label="Delete note"
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary-action"
            disabled={submitting || (isEditing && !hasChanges)}
          >
            <Save size={15} />
            <span>{submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Note'}</span>
          </button>
        </div>
      </header>

      {/* Global Feedback Banners */}
      {error && (
        <div className="alert-banner alert-banner-danger" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-banner alert-banner-success" role="status">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Access Denied View */}
      {accessDenied ? (
        <div className="editor-access-denied-card">
          <div className="access-denied-icon-box">
            <Lock size={32} />
          </div>
          <h2>Access Restricted</h2>
          <p>
            You do not have permission to view or edit this note.
            All notes in this workspace are strictly isolated on the Frappe backend.
          </p>
          <Link to="/notes" className="btn-primary-action mt-4">
            Return to All Notes
          </Link>
        </div>
      ) : loading ? (
        <div className="editor-canvas">
          <div className="skeleton-line skeleton-title mb-6"></div>
          <div className="skeleton-line skeleton-text mb-6"></div>
          <div className="skeleton-line skeleton-text mb-6"></div>
          <div className="skeleton-line skeleton-text short"></div>
        </div>
      ) : (
        /* Distraction-Free Note Canvas */
        <div className="editor-canvas">
          <form onSubmit={handleSubmit} className="editor-form">
            {/* Note Title Input */}
            <div className="editor-title-container">
              <input
                type="text"
                placeholder="Note Title..."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                disabled={submitting}
                maxLength={140}
                className="editor-title-field"
                autoFocus={!isEditing}
                required
              />
            </div>

            {/* Document Meta Row */}
            <div className="editor-doc-meta-row">
              <div className="doc-meta-item">
                <User size={13} />
                <span>Owner: <strong>{isEditing ? noteOwner : `${user} (You)`}</strong></span>
              </div>
              {timestamps && (
                <div className="doc-meta-item">
                  <Clock size={13} />
                  <span>Last modified: {formatFullDateTime(timestamps.modified)}</span>
                </div>
              )}
              <div className="doc-meta-item doc-meta-secure">
                <Shield size={13} />
                <span>Strict Server Isolation</span>
              </div>
            </div>

            {/* Note Content Textarea */}
            <div className="editor-content-container">
              <textarea
                placeholder="Start typing your note here... Markdown is supported."
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                disabled={submitting}
                className="editor-textarea-field"
                rows={18}
                required
              />
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal-backdrop-scrim"
          onClick={() => !deleting && setShowDeleteModal(false)}
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
                  Are you sure you want to permanently delete <strong>"{title}"</strong>?
                  This action is irreversible.
                </p>
              </div>
            </div>

            <div className="delete-dialog-footer">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNote}
                className="btn-danger-action"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
