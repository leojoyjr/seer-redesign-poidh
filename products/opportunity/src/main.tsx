import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './app.css';
import './ledger.css';
import './secondary.css';
import './shell-v6.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
