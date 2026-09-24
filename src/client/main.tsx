import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Automatically inject Authorization header if user has an active session token
const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('lenz_token');
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

  if (token && urlStr && urlStr.includes('/api/')) {
    const headers = new Headers(init?.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await originalFetch(input, { ...init, headers });
    if (res.status === 401 && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/register')) {
      localStorage.removeItem('lenz_token');
    }
    return res;
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
