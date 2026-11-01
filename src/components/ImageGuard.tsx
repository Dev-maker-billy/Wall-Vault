'use client';

import { useEffect } from 'react';

/**
 * Removes the easy ways to save an image straight off the page: the right-click menu,
 * dragging an image out, and the long-press "save image" menu on phones.
 *
 * This only stops casual saving. Screenshots and browser developer tools still work, which is
 * why the full-size originals are kept private and only reachable through the Download button.
 */
export default function ImageGuard() {
  useEffect(() => {
    const isImage = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('img, picture, [data-protect]'));

    const block = (e: Event) => {
      if (isImage(e.target)) e.preventDefault();
    };

    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);

  return null;
}
