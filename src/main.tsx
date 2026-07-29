import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "@aejkatappaja/phantom-ui";
import "@aejkatappaja/phantom-ui/ssr.css";
import App from './App.tsx';
import './index.css';

// Workaround for phantom-ui "inert" attribute getting stuck on React DOM reconciliation/updates.
// This ensures hover and click interactions are fully restored on Microsoft Edge and other browsers.
if (typeof window !== 'undefined') {
  const fixPhantomUiInert = () => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // 1. When 'loading' attribute is removed from phantom-ui
        if (mutation.type === 'attributes' && mutation.attributeName === 'loading') {
          const target = mutation.target as HTMLElement;
          if (target.tagName.toLowerCase() === 'phantom-ui' && !target.hasAttribute('loading')) {
            target.querySelectorAll('[inert]').forEach((el) => {
              el.removeAttribute('inert');
            });
          }
        }
        // 2. When children are added/updated inside a non-loading phantom-ui
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const phantomParent = node.closest('phantom-ui');
              if (phantomParent && !phantomParent.hasAttribute('loading')) {
                if (node.hasAttribute('inert')) {
                  node.removeAttribute('inert');
                }
                node.querySelectorAll('[inert]').forEach((el) => {
                  el.removeAttribute('inert');
                });
              }
            }
          });
        }
        // 3. When inert is added to any element inside a non-loading phantom-ui
        if (mutation.type === 'attributes' && mutation.attributeName === 'inert') {
          const target = mutation.target as HTMLElement;
          const phantomParent = target.closest('phantom-ui');
          if (phantomParent && !phantomParent.hasAttribute('loading') && target.hasAttribute('inert')) {
            target.removeAttribute('inert');
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['loading', 'inert'],
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixPhantomUiInert);
  } else {
    fixPhantomUiInert();
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
