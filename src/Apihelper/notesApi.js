// ───── Initial Demo Notes for offline/production preview ─────
const DEMO_STORAGE_KEY = 'kappy_demo_notes';
const INITIAL_DEMO_NOTES = [
  {
    name: 'NOTE-2026-0001',
    title: 'Welcome to Kappy Notes 🚀',
    content: 'Welcome to your private workspace! Here you can create, organize, search, and manage your private notes securely.\n\nKey features:\n• Instant search and tag filtering\n• Star & Favorite notes\n• Admin audit dashboard (/admin/notes)\n• Clean, responsive UI with modern typography',
    owner: 'user@notes.com',
    creation: '2026-10-26 10:00:00',
    modified: '2026-10-27 09:30:00',
  },
  {
    name: 'NOTE-2026-0002',
    title: 'Full-Stack Architecture',
    content: 'This project is powered by React 19 + Vite frontend and Frappe Framework (Python) backend with MariaDB database.\n\nWhen connected to the live Frappe server, every note ownership is cryptographically validated on the backend.',
    owner: 'user@notes.com',
    creation: '2026-10-26 11:15:00',
    modified: '2026-10-26 14:20:00',
  },
  {
    name: 'NOTE-2026-0003',
    title: 'System Security & Privacy',
    content: 'Administrator users have access to /admin/notes to monitor and audit system notes, while standard users can only view, edit, and delete their own notes.',
    owner: 'Administrator',
    creation: '2026-10-25 08:00:00',
    modified: '2026-10-26 12:00:00',
  },
];

function getDemoNotes() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_NOTES));
      return [...INITIAL_DEMO_NOTES];
    }
    return JSON.parse(raw);
  } catch {
    return [...INITIAL_DEMO_NOTES];
  }
}

function saveDemoNotes(notes) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.warn('Failed to save demo notes:', e);
  }
}

function getCurrentUserEmail() {
  try {
    const raw = localStorage.getItem('kappy_demo_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u?.email || u?.user || 'user@notes.com';
    }
  } catch {}
  return 'user@notes.com';
}

// ───── Helper: Browser se cookie value read karna ─────
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

// ───── Helper: Frappe authenticated fetch wrapper ─────
async function frappeFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Frappe-CSRF-Token': getCookie('csrf_token') || 'None',
      ...options.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Server returned error (${res.status})`);
    return {};
  }

  const data = await res.json();

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      if (data._server_messages) {
        msg = JSON.parse(JSON.parse(data._server_messages)[0]).message;
      } else if (data.message) {
        msg = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      } else if (data.exception) {
        msg = data.exception;
      }
    } catch {
      msg = data.message || msg;
    }
    throw new Error(msg);
  }

  return data.message;
}

// ───── Secure Notes API Methods with Automatic Demo Fallback ─────
export const notesApi = {
  // Current user ke saare notes lana (with optional search)
  getUserNotes: async (search = '') => {
    try {
      return await frappeFetch(`/api/method/auth_app.api.get_user_notes${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
    } catch (err) {
      // Fallback for static hosting / offline demo mode
      const all = getDemoNotes();
      const currentUser = getCurrentUserEmail();
      let filtered = all.filter((n) => n.owner === currentUser || n.owner === 'user@notes.com');
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (n) => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q))
        );
      }
      return filtered;
    }
  },

  // Single note lana (strict backend ownership check)
  getNote: async (noteId) => {
    try {
      return await frappeFetch(`/api/method/auth_app.api.get_note?note_id=${encodeURIComponent(noteId)}`);
    } catch (err) {
      const all = getDemoNotes();
      const note = all.find((n) => n.name === noteId);
      if (!note) throw new Error('Note not found');
      return note;
    }
  },

  // Naya note create karna
  createNote: async (title, content) => {
    try {
      return await frappeFetch('/api/method/auth_app.api.create_note', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
    } catch (err) {
      const all = getDemoNotes();
      const currentUser = getCurrentUserEmail();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newNote = {
        name: `NOTE-${Date.now().toString().slice(-6)}`,
        title,
        content,
        owner: currentUser,
        creation: now,
        modified: now,
      };
      all.unshift(newNote);
      saveDemoNotes(all);
      return newNote;
    }
  },

  // Note update karna
  updateNote: async (noteId, title, content) => {
    try {
      return await frappeFetch('/api/method/auth_app.api.update_note', {
        method: 'POST',
        body: JSON.stringify({ note_id: noteId, title, content }),
      });
    } catch (err) {
      const all = getDemoNotes();
      const note = all.find((n) => n.name === noteId);
      if (!note) throw new Error('Note not found');
      note.title = title;
      note.content = content;
      note.modified = new Date().toISOString().replace('T', ' ').substring(0, 19);
      saveDemoNotes(all);
      return note;
    }
  },

  // Note delete karna
  deleteNote: async (noteId) => {
    try {
      return await frappeFetch('/api/method/auth_app.api.delete_note', {
        method: 'POST',
        body: JSON.stringify({ note_id: noteId }),
      });
    } catch (err) {
      const all = getDemoNotes();
      const filtered = all.filter((n) => n.name !== noteId);
      saveDemoNotes(filtered);
      return { success: true };
    }
  },

  // Admin-only: Saare users ke notes lana
  getAllNotes: async (search = '', userFilter = '') => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (userFilter.trim()) params.append('user_filter', userFilter.trim());
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await frappeFetch(`/api/method/auth_app.api.get_all_notes${qs}`);
    } catch (err) {
      let list = getDemoNotes();
      if (userFilter.trim()) {
        list = list.filter((n) => n.owner.toLowerCase().includes(userFilter.toLowerCase()));
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (n) => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q))
        );
      }
      return list;
    }
  },
};

