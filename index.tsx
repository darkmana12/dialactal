// Fix: Add React and ReactDOM from window to scope to fix undefined errors.
const { React, ReactDOM } = window;

const { App } = window.WikiCherche;

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