import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './app.css';
import './components/seer-shell.css';
import '@seer/ef/seer-shell.css';
import '@seer/ef/seer-subbar.css';
import './redesign.css';
import './v2.css';
import { mountSeerShell } from '@seer/ef/seer-shell.js';

mountSeerShell({ current: 'deep' });

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

import './repairs.css';

import "./comparison.css";
import './repository-layout.css';
