import React, { useEffect, useRef } from 'react';
import useAuthStore from '../store/auth';

export default function WebWrapper({ backendUrl }) {
  const iframeRef = useRef(null);
  const { token, logout } = useAuthStore();

  useEffect(() => {
    if (iframeRef.current && token) {
      // Send token to iframe
      iframeRef.current.contentWindow.postMessage(
        { type: 'SET_TOKEN', token },
        backendUrl
      );
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 1000,
          padding: '10px',
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Logout
        </button>
      </div>

      <iframe
        ref={iframeRef}
        src={backendUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        title="AS App"
        allow="camera; microphone; payment"
      />
    </div>
  );
}
