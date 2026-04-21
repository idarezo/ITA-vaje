import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const roots = new Map();

const renderApp = (container, shellContext = {}) => {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App shellContext={shellContext} />
    </React.StrictMode>,
  );

  roots.set(container, root);

  return () => {
    const mountedRoot = roots.get(container);
    if (mountedRoot) {
      mountedRoot.unmount();
      roots.delete(container);
    }
  };
};

window.authMf = {
  mount(container, shellContext) {
    return renderApp(container, shellContext);
  },
};

const rootElement = document.getElementById("root");

if (rootElement) {
  renderApp(rootElement, {
    baseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:8080",
  });
}

reportWebVitals();
