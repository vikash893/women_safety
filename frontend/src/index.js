import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/auth';
import { SafetyProvider } from './context/SafetyContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <SafetyProvider>
      <App />
    </SafetyProvider>
  </AuthProvider>
);
