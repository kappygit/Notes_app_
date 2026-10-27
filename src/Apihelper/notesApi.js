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

// ───── Secure Notes API Methods ─────
export const notesApi = {
  // Current user ke saare notes lana (with optional search)
  getUserNotes: async (search = '') => {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return await frappeFetch(`/api/method/auth_app.api.get_user_notes${query}`);
  },

  // Single note lana (strict backend ownership check)
  getNote: async (noteId) => {
    return await frappeFetch(`/api/method/auth_app.api.get_note?note_id=${encodeURIComponent(noteId)}`);
  },

  // Naya note create karna (backend automatically assigns owner = frappe.session.user)
  createNote: async (title, content) => {
    return await frappeFetch('/api/method/auth_app.api.create_note', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  },

  // Note update karna (ownership check on server)
  updateNote: async (noteId, title, content) => {
    return await frappeFetch('/api/method/auth_app.api.update_note', {
      method: 'POST',
      body: JSON.stringify({ note_id: noteId, title, content }),
    });
  },

  // Note delete karna (ownership check on server)
  deleteNote: async (noteId) => {
    return await frappeFetch('/api/method/auth_app.api.delete_note', {
      method: 'POST',
      body: JSON.stringify({ note_id: noteId }),
    });
  },

  // Admin-only: Saare users ke notes lana (with search & user_filter)
  getAllNotes: async (search = '', userFilter = '') => {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (userFilter.trim()) params.append('user_filter', userFilter.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await frappeFetch(`/api/method/auth_app.api.get_all_notes${qs}`);
  },
};
