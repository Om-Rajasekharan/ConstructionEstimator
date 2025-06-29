import React, { useState } from 'react';
import './SignInUp.css';

function CompleteProfile({ onComplete, token }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/complete-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, company }),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      onComplete && onComplete(data.user);
    } else {
      setError(data.error || 'Profile update failed');
    }
  };

  return (
    <div className="auth-container">
      <h2>Complete Your Profile</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          placeholder="Full Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          placeholder="Company"
          value={company}
          onChange={e => setCompany(e.target.value)}
          required
        />
        <button type="submit">Save</button>
      </form>
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}

export default CompleteProfile;
