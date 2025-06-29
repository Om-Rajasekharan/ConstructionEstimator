import React from 'react';
import './Settings.css';

function Settings({ user, onLogout }) {
  return (
    <div className="settings-container">
      <h2>Profile</h2>
      <div className="profile-section">
        <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
        <div><strong>Name:</strong> {user?.name || 'N/A'}</div>
        <div><strong>Company:</strong> {user?.company || 'N/A'}</div>
      </div>
      <button className="logout-btn" onClick={onLogout}>Log Out</button>
    </div>
  );
}

export default Settings;
