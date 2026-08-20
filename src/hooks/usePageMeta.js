import { useEffect } from 'react';

// The middleware at the project root handles the pages that matter most for
// search and link sharing (individual product pages) with real server-side
// tags, since crawlers that don't run JS need that. This hook covers the
// rest of the site's static pages -- cheap client-side title/description
// updates so each one is still distinct rather than all sharing the same
// generic homepage title in Google's rendered index and in the browser tab.
export default function usePageMeta(title, description) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content');
    if (meta && description) {
      meta.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription) {
        meta.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}
