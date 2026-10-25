import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter-tight';
import './design-system/tokens.css';
import './design-system/typography.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <React.Suspense fallback={null}><App /></React.Suspense>
  </React.StrictMode>
);
