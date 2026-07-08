import React, { useEffect, useState } from 'react';
import './App.css';
import WebWrapper from './components/WebWrapper';
import useAuthStore from './store/auth';

export default function App() {
  const { isLoggedIn, checkAuth, loading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    checkAuth().then(() => setInitialized(true));
  }, []);

  if (!initialized || loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return <WebWrapper backendUrl="https://as-wryo.onrender.com" />;
}
