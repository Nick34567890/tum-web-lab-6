import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.jsx';
import { ThemeProvider } from './app/ThemeProvider.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter basename="/tum-web-lab-6">
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
