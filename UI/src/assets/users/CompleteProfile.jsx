import React, { useState } from 'react';
import './SignInUp.css';

function CompleteProfile({ onComplete, token }) {
  const [name, setName] = useState('');
  const [userType, setUserType] = useState(null); // null until selected
  const [adminKey, setAdminKey] = useState('');
  const [userKey, setUserKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    let payload = { name, userType };
    if (userType === 'admin') {
      payload.adminKey = adminKey;
    } else {
      payload.userKey = userKey;
    }
    const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/complete-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      // Ensure token is preserved in user object for dashboard transition
      const userWithToken = { ...data.user, token };
      onComplete && onComplete(userWithToken);
    } else {
      setError(data.error || 'Profile update failed');
    }
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
        <h2 className="auth-title" style={{ color: '#232526', fontWeight: 900, fontSize: '2.1rem', letterSpacing: '2px', marginBottom: '1.3rem', textShadow: '0 2px 12px #ff4b0033' }}>
          Complete Your Profile
        </h2>
        {!userType ? (
          <div style={{ display: 'flex', gap: 18, margin: '1.2rem 0 1.7rem 0', width: '100%', justifyContent: 'center' }}>
            <button
              type="button"
              className="auth-btn main-btn"
              style={{
                background: '#fff7f2',
                color: '#232526',
                fontWeight: 700,
                fontSize: '1.08rem',
                borderRadius: 16,
                border: '2.5px solid #ff6a1a',
                boxShadow: '0 2px 12px #ff4b0033',
                padding: '1.2rem 2.2rem',
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'box-shadow 0.2s, border-color 0.2s',
                cursor: 'pointer',
                borderBottom: '4px solid #ffb380',
              }}
              onClick={() => setUserType('employee')}
              onMouseOver={e => e.currentTarget.style.borderColor = '#ff4b00'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#ff6a1a'}
            >
              <span style={{ fontSize: '1.22rem', fontWeight: 900, color: '#ff6a1a', letterSpacing: '1px', marginBottom: 2, textShadow: '0 2px 8px #ffb38055' }}>Employee Access</span>
              <span style={{ fontSize: '0.89rem', color: '#888', fontWeight: 500, textAlign: 'center', lineHeight: 1.35, maxWidth: 210, marginTop: 2 }}>
                For users who received a license key from their company administrator.
              </span>
            </button>
            <button
              type="button"
              className="auth-btn main-btn"
              style={{
                background: '#fff7f2',
                color: '#232526',
                fontWeight: 700,
                fontSize: '1.08rem',
                borderRadius: 16,
                border: '2.5px solid #ff6a1a',
                boxShadow: '0 2px 12px #ff4b0033',
                padding: '1.2rem 2.2rem',
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'box-shadow 0.2s, border-color 0.2s',
                cursor: 'pointer',
                borderBottom: '4px solid #ffb380',
              }}
              onClick={() => setUserType('admin')}
              onMouseOver={e => e.currentTarget.style.borderColor = '#ff4b00'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#ff6a1a'}
            >
              <span style={{ fontSize: '1.22rem', fontWeight: 900, color: '#ff6a1a', letterSpacing: '1px', marginBottom: 2, textShadow: '0 2px 8px #ffb38055' }}>Administrator Access</span>
              <span style={{ fontSize: '0.89rem', color: '#888', fontWeight: 500, textAlign: 'center', lineHeight: 1.35, maxWidth: 210, marginTop: 2 }}>
                For company admins who purchased a license and received an administrative key.
              </span>
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} autoComplete="off" style={{ width: '100%' }}>
            <input
              className="auth-input"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{ border: '1.5px solid #e3e4e8', background: '#fff', color: '#232526', fontWeight: 600 }}
            />
            {userType === 'employee' ? (
              <input
                className="auth-input"
                placeholder="UserKey"
                value={userKey}
                onChange={e => setUserKey(e.target.value)}
                required
                style={{ border: '1.5px solid #e3e4e8', background: '#fff', color: '#232526', fontWeight: 600, marginTop: 12 }}
              />
            ) : (
              <input
                className="auth-input"
                placeholder="AdminKey"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                required
                style={{ border: '1.5px solid #e3e4e8', background: '#fff', color: '#232526', fontWeight: 600, marginTop: 12 }}
              />
            )}
            <button type="submit" className="auth-btn main-btn" style={{ background: 'linear-gradient(90deg, #ff6a1a 0%, #ffb380 100%)', color: '#fff', fontWeight: 700, fontSize: '1.08rem', borderRadius: 12, border: '0', boxShadow: '0 2px 12px #ff4b0033', marginTop: 16, marginBottom: 8, padding: '0.7rem 0' }}>
              Save
            </button>
            <button type="button" className="auth-btn" style={{ background: 'none', color: '#ff6a1a', fontWeight: 700, fontSize: '1rem', borderRadius: 8, border: '0', marginTop: 6, marginBottom: 0, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setUserType(null)}>
              Back
            </button>
          </form>
        )}
        {error && <div className="auth-error" style={{ color: '#d32f2f', fontWeight: 700, marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  );
}

export default CompleteProfile;
