import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import './components/seer-shell.css';
import '@seer/ef/seer-shell.css';
import '@seer/ef/seer-subbar.css';
import { mountSeerShell } from '@seer/ef/seer-shell.js';
import './styles/tokens.css';
import './styles/base.css';
import './styles/controls.css';
import './styles/shell.css';
import './styles/landing-lanes.css';
import './styles/landing-hero.css';
import './styles/landing-lists.css';
import './styles/detail-core.css';
import './styles/chart.css';
import './styles/overlays.css';
import './styles/app-layout.css';
import './styles/live.css';
import './styles/fixes.css';

mountSeerShell({ current: 'futarchy' });

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
