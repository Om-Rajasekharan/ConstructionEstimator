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
    const googleUrl = `${API_URL}/google`;
    window.location.href = googleUrl;
  };

  return (
    <div className="auth-container" style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(180deg, #ffecd9 0%, #fff6f2 30%, #fff 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '4.5rem', marginBottom: '1.5rem', zIndex: 2 }}>
        <img src="/logo1t.png" alt="Logo" style={{ maxWidth: 340, width: '60vw', height: 'auto', filter: 'drop-shadow(0 8px 32px #ff4b0033)', background: 'none', borderRadius: 24, padding: '0.5rem 0', objectFit: 'contain' }} />
      </div>
      <div className="auth-card" style={{
        background: '#fff',
        border: 'none',
        boxShadow: '0 8px 36px 0 #ff4b0033',
        borderRadius: 22,
        padding: '2.7rem 2.7rem 2.2rem 2.7rem',
        maxWidth: 390,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1,
      }}>
        <h2 className="auth-title" style={{ color: '#232526', fontWeight: 900, fontSize: '2.3rem', letterSpacing: '2px', marginBottom: '1.7rem', textShadow: '0 2px 12px #ff4b0033' }}>
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          {mode === 'signup' && (
            <input
              className="auth-input"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              style={{ border: '1.5px solid #e3e4e8', background: '#fff', color: '#232526', fontWeight: 600 }}
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
            style={{ border: '1.5px solid #e3e4e8', background: '#fff', color: '#232526', fontWeight: 600 }}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            style={{ border: '1.5px solid #e3e4e8', background: '#fff', color: '#232526', fontWeight: 600 }}
          />
          <button type="submit" className="auth-btn main-btn" style={{ background: 'linear-gradient(90deg, #ff6a1a 0%, #ffb380 100%)', color: '#fff', fontWeight: 700, fontSize: '1.15rem', borderRadius: 12, border: '0', boxShadow: '0 2px 12px #ff4b0033', marginTop: 12, marginBottom: 8, padding: '0.7rem 0' }}>
            {mode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        <div className="divider" style={{ margin: '1.2rem 0', color: '#ff6a1a' }}><span>or</span></div>
        <button className="google-btn" onClick={handleGoogle} style={{ background: '#fff', color: '#232526', border: '1.5px solid #e3e4e8', fontWeight: 700, borderRadius: 10, boxShadow: '0 2px 8px #ff4b0033', marginBottom: 10, padding: '0.6rem 0' }}>
          <svg width="22" height="22" viewBox="0 0 48 48" style={{ marginRight: 8, verticalAlign: 'middle' }}><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.97 2.7 30.41 0 24 0 14.82 0 6.73 5.48 2.69 13.44l7.98 6.2C12.36 13.13 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.65c-1.13-3.36-1.13-6.99 0-10.35l-7.98-6.2C.7 16.41 0 20.11 0 24c0 3.89.7 7.59 1.98 11.1l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.41 0 11.8-2.12 15.73-5.77l-7.19-5.6c-2.01 1.35-4.59 2.15-8.54 2.15-6.26 0-11.64-3.63-13.33-8.85l-7.98 6.2C6.73 42.52 14.82 48 24 48z"/></g></svg>
          Sign in with Google
        </button>
        <p className="switch-auth-row" style={{ marginTop: 10, color: '#232526', fontWeight: 600 }}>
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
          <button type="button" className="switch-auth" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')} style={{ color: '#fff', background: '#ff6a1a', border: 'none', borderRadius: 8, marginLeft: 8, fontWeight: 700, padding: '0.2rem 0.8rem', boxShadow: '0 2px 8px #ff4b0033', cursor: 'pointer' }}>
            {mode === 'signup' ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
        {error && <div className="auth-error" style={{ color: '#d32f2f', fontWeight: 700, marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  );
}

export default SignInUp;