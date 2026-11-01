'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom cursor for mouse users: a dot that sticks to the pointer and a ring that trails it.
 * The ring swells over buttons and links, and becomes a "Download" circle over wallpapers.
 *
 * It switches itself off for touch, for reduced-motion settings, and while a dialog is open
 * (dialogs sit above everything, so the normal cursor is used there).
 */
export default function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = rootRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!finePointer.matches || reducedMotion.matches || !root || !dot || !ring) return;

    const html = document.documentElement;
    let targetX = -100;
    let targetY = -100;
    let ringX = targetX;
    let ringY = targetY;
    let frame = 0;
    let visible = false;
    let dialogOpen = false;

    function sync() {
      const show = visible && !dialogOpen;
      html.classList.toggle('custom-cursor', show);
      root!.dataset.hidden = String(!show);
    }

    function tick() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      dot!.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      ring!.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      const settled = Math.abs(targetX - ringX) < 0.1 && Math.abs(targetY - ringY) < 0.1;
      frame = settled ? 0 : requestAnimationFrame(tick);
    }

    function start() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        // First movement: put the ring under the pointer instead of flying in from the corner.
        ringX = targetX;
        ringY = targetY;
        visible = true;
        sync();
      }

      const el = e.target instanceof Element ? e.target : null;
      const mode = el?.closest('[data-cursor="tile"]')
        ? 'tile'
        : el?.closest('a, button, label, summary, input, select, textarea, [role="button"]')
          ? 'link'
          : 'default';
      if (root!.dataset.mode !== mode) root!.dataset.mode = mode;

      start();
    }

    const onDown = () => {
      root.dataset.down = 'true';
    };
    const onUp = () => {
      root.dataset.down = 'false';
    };
    const onLeave = () => {
      visible = false;
      sync();
    };

    const observer = new MutationObserver(() => {
      dialogOpen = Boolean(document.querySelector('dialog[open]'));
      sync();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    });

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    html.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      html.removeEventListener('mouseleave', onLeave);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      html.classList.remove('custom-cursor');
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-hidden="true"
      data-mode="default"
      data-down="false"
      className="cursor-root"
    >
      <div ref={ringRef} className="cursor-follow">
        <div className="cursor-ring" />
        <span className="cursor-label">Download</span>
      </div>
      <div ref={dotRef} className="cursor-follow">
        <div className="cursor-dot" />
      </div>
    </div>
  );
}
