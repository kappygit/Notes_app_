import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ───── Helper: Frappe ke API ko call karne ka clean wrapper ─────
// credentials: 'include' zaroori hai taaki browser cookies (session) bheje
// X-Frappe-CSRF-Token header Frappe CSRF protection ke liye zaroori hai
async function frappeCall(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include', // Cookies bhejna zaroori hai (session auth)
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Frappe-CSRF-Token': getCookie('csrf_token') || 'None',
      ...options.headers,
    },
    ...options,
  });

  // Non-JSON responses ke liye (e.g., HTML error pages)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    return {};
  }

  const data = await res.json();

  if (!res.ok) {
    // Frappe error format: { exc_type, _server_messages, ... }
    let msg = `Request failed (${res.status})`;
    try {
      if (data._server_messages) {
        msg = JSON.parse(JSON.parse(data._server_messages)[0]).message;
      } else if (data.message) {
        msg = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      }
    } catch {
      msg = data.message || data.exc || msg;
    }
    throw new Error(msg);
  }

  return data;
}

// ───── Browser cookie padhne ka helper ─────
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

// ───── Context Create ─────
const AuthContext = createContext(null);

// ───── AuthProvider ─────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Logged-in user email
  const [fullName, setFullName] = useState('');   // User full name
  const [roles, setRoles] = useState([]);          // User roles array
  const [loading, setLoading] = useState(true);    // Initial session check

  // Derived values
  const isAuthenticated = !!user;
  const isAdmin = roles.includes('System Manager') || roles.includes('Administrator');

  const checkSession = useCallback(async () => {
    try {
      const data = await frappeCall('/api/method/auth_app.api.get_session');
      const session = data?.message;

      if (session && session.authenticated && session.user && session.user !== 'Guest') {
        setUser(session.user);
        setFullName(session.full_name || session.user);
        setRoles(session.roles || []);
      } else {
        setUser(null);
        setFullName('');
        setRoles([]);
      }
    } catch (err) {
      console.warn('Session check warning:', err.message);
      setUser(null);
      setFullName('');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ───── On mount: Session check karo ─────
  useEffect(() => {
    let ignore = false;
    frappeCall('/api/method/auth_app.api.get_session')
      .then((data) => {
        if (!ignore) {
          const session = data?.message;
          if (session && session.authenticated && session.user && session.user !== 'Guest') {
            setUser(session.user);
            setFullName(session.full_name || session.user);
            setRoles(session.roles || []);
          } else {
            setUser(null);
            setFullName('');
            setRoles([]);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn('Session check warning:', err.message);
          setUser(null);
          setFullName('');
          setRoles([]);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);


  // ───── LOGIN ─────
  const login = useCallback(async (email, password) => {
    // Step 1: Frappe login API call (sets session cookie)
    await frappeCall('/api/method/login', {
      method: 'POST',
      body: JSON.stringify({ usr: email, pwd: password }),
    });

    // Step 2: Fetch confirmed session, user info & roles
    const sessionData = await frappeCall('/api/method/auth_app.api.get_session');
    const session = sessionData.message;

    if (session && session.authenticated) {
      setUser(session.user);
      setFullName(session.full_name || session.user);
      setRoles(session.roles || []);
      return session.user;
    } else {
      // Fallback
      setUser(email);
      setFullName(email);
      setRoles([]);
      return email;
    }
  }, []);

  // ───── REGISTER (Create Account with verification link) ─────
  const register = useCallback(async (name, email, password) => {
    const result = await frappeCall('/api/method/auth_app.api.register_user', {
      method: 'POST',
      body: JSON.stringify({
        full_name: name,
        email: email,
        password: password,
      }),
    });
    return result.message;
  }, []);

  // ───── VERIFY EMAIL ─────
  const verifyEmail = useCallback(async (token) => {
    const result = await frappeCall('/api/method/auth_app.api.verify_email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return result.message;
  }, []);

  // ───── RESEND VERIFICATION EMAIL ─────
  const resendVerification = useCallback(async (email) => {
    const result = await frappeCall('/api/method/auth_app.api.resend_verification_email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return result.message;
  }, []);

  // ───── LOGOUT ─────
  const logout = useCallback(async () => {
    try {
      await frappeCall('/api/method/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout error:', err.message);
    }
    setUser(null);
    setFullName('');
    setRoles([]);
  }, []);

  const value = {
    user,
    fullName,
    roles,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    register,
    verifyEmail,
    resendVerification,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ───── Custom hook ─────
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}