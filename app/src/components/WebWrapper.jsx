import React, { useEffect, useRef } from 'react';
import useAuthStore from '../store/auth';

export default function WebWrapper({ backendUrl }) {
  const iframeRef = useRef(null);
  const { token, logout } = useAuthStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  useEffect(() => {
    if (iframeRef.current && token) {
      // Send token to iframe
      iframeRef.current.contentWindow.postMessage(
        { type: 'SET_TOKEN', token },
        backendUrl
      );
    }
  }, [token]);

  // Handle Android back button
  useEffect(() => {
    const handleBackButton = () => {
      if (dialogOpen) {
        // Close dialog if open
        setDialogOpen(false);
        // Send message to iframe to close any alerts/dialogs
        if (iframeRef.current) {
          iframeRef.current.contentWindow.postMessage(
            { type: 'CLOSE_DIALOG' },
            backendUrl
          );
        }
      } else {
        // Go back in history
        if (iframeRef.current?.contentWindow?.history?.length > 1) {
          iframeRef.current.contentWindow.history.back();
        } else {
          // Exit app if at first page
          window.history.back();
        }
      }
    };

    // Listen for back button press
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        handleBackButton();
      }
    });

    // For Android WebView
    if (window.Android && window.Android.onBackPressed) {
      window.Android.onBackPressed = handleBackButton;
    }

    return () => {
      window.removeEventListener('keydown', handleBackButton);
    };
  }, [dialogOpen, backendUrl]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  // Handle file downloads
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== backendUrl) return;

      if (event.data.type === 'DOWNLOAD_FILE') {
        downloadFile(event.data.url, event.data.filename);
      } else if (event.data.type === 'DIALOG_OPEN') {
        setDialogOpen(true);
      } else if (event.data.type === 'DIALOG_CLOSE') {
        setDialogOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [backendUrl]);

  const downloadFile = (url, filename) => {
    // For Android WebView
    if (window.Android && window.Android.downloadFile) {
      window.Android.downloadFile(url, filename);
      return;
    }

    // For web browsers
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        allow="camera; microphone; payment; downloads"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
