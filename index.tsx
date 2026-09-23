import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Página de amostra do design system (/__ui), só em desenvolvimento. No build
// de produção import.meta.env.DEV é false e o import some do bundle.
const Showcase = import.meta.env.DEV ? React.lazy(() => import('./components/ui/Showcase')) : null;
const isShowcase = window.location.pathname === '/__ui';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {Showcase && isShowcase ? (
      <Suspense fallback={null}><Showcase /></Suspense>
    ) : (
      <HelmetProvider>
        <App />
      </HelmetProvider>
    )}
  </React.StrictMode>
);