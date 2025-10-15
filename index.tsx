// FIX: Import React and ReactDOM from their respective packages.
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Import the App component using ES modules.
import { App } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
