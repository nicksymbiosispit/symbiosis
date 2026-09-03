import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary><App /></AppErrorBoundary>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
