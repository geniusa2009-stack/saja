import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/styles/fonts';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/design-system/ds.css';
import { App } from '@/app/App';

// After a new release, an open tab may ask for a code chunk that no longer exists.
// Reload once into the new release instead of showing a broken screen.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('saja:reloaded-for-release')) return;
    sessionStorage.setItem('saja:reloaded-for-release', '1');
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
