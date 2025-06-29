import React, { useState } from 'react';
import './SignInUp.css';

const API_URL = import.meta.env.VITE_API_URL + '/api/auth';

function SignInUp({ onAuth }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = mode === 'signup' ? `${API_URL}/signup` : `${API_URL}/signin`;
    const body = mode === 'signup' ? { email, password, name } : { email, password };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      onAuth && onAuth(data.user);
    } else {
      setError(data.error || 'Auth failed');
    }
  };

  const handleGoogle = () => {
    window.location.href = `${API_URL}/google`;
  };

  return (
    <div className="auth-container rustic-bg">
      <div className="auth-card">
        <h2 className="auth-title">{mode === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          {mode === 'signup' && (
            <input
              className="auth-input"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          )}
          <input
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            type="email"
            autoComplete="username"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          <button type="submit" className="auth-btn main-btn">
            {mode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        <div className="divider"><span>or</span></div>
        <button className="google-btn" onClick={handleGoogle}>
          <svg width="22" height="22" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.97 2.7 30.41 0 24 0 14.82 0 6.73 5.48 2.69 13.44l7.98 6.2C12.36 13.13 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.65c-1.13-3.36-1.13-6.99 0-10.35l-7.98-6.2C.7 16.41 0 20.11 0 24c0 3.89.7 7.59 1.98 11.1l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.41 0 11.8-2.12 15.73-5.77l-7.19-5.6c-2.01 1.35-4.59 2.15-8.54 2.15-6.26 0-11.64-3.63-13.33-8.85l-7.98 6.2C6.73 42.52 14.82 48 24 48z"/></g></svg>
          Sign in with Google
        </button>
        <p className="switch-auth-row">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
          <button type="button" className="switch-auth" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
            {mode === 'signup' ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
        {error && <div className="auth-error">{error}</div>}
      </div>
    </div>
  );
}

export default SignInUp;