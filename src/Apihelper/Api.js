export const loginApi = async (username, password) => {
  const res = await fetch('/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ usr: username, pwd: password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw err;
  }
  return await res.json(); // expected { user, token }
};

export const logoutApi = async () => {
  try {
    await fetch('/api/method/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Ignore logout network errors on cleanup
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};

export const getCurrentUserApi = () => {
  const stored = localStorage.getItem('auth_user');
  return stored ? JSON.parse(stored) : null;
};
