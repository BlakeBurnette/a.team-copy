import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import './index.css';
import config from './config';
import { AuthProvider } from './context/AuthContext';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = config.apiOrigin || undefined;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Dispatch event for prerenderer to know when rendering is complete
document.dispatchEvent(new Event('render-event'));
