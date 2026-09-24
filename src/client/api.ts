import { User } from './types';

const TOKEN_KEY = 'lenz_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function authFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers
  });
}

export async function getCurrentUser(): Promise<{ authenticated: boolean; user: User | null }> {
  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) {
      if (res.status === 401) {
        clearStoredToken();
      }
      return { authenticated: false, user: null };
    }
    const data = await res.json();
    return {
      authenticated: Boolean(data.authenticated),
      user: data.user || null
    };
  } catch {
    return { authenticated: false, user: null };
  }
}

export async function loginApi(username: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'خطا در ورود به حساب کاربری');
  }

  setStoredToken(data.token);
  return data;
}

export async function registerApi(
  username: string, 
  password: string, 
  displayName: string, 
  email?: string
): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName, email })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'خطا در ثبت‌نام حساب کاربری');
  }

  setStoredToken(data.token);
  return data;
}

export async function logoutApi(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network error on logout
  } finally {
    clearStoredToken();
  }
}

export async function updateProfileApi(params: {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<User> {
  const res = await authFetch('/api/auth/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'خطا در به‌روزرسانی اطلاعات حساب');
  }
  return data.user;
}
