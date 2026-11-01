'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom cursor for mouse users.
 *
 * - A dot sticks to the pointer; a ring trails it and stretches in the direction it is moving.
 * - The ring swells over buttons and links, and becomes a "Download" circle over wallpapers.
 * - Clicking sends out a ripple.
 * - Elements marked data-magnetic lean toward the pointer.
 *
 * It switches itself off for touch, for reduced-motion settings, and while a dialog is open
 * (dialogs sit above everything, so the normal cursor is used there).
 */
export default function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const stretchRef = useRef<HTMLDivElement>(null);
  const rippleHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = rootRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const stretch = stretchRef.current;
    const rippleHost = rippleHostRef.current;
    if (
      !finePointer.matches ||
      reducedMotion.matches ||
      !root ||
      !dot ||
      !ring ||
      !stretch ||
      !rippleHost
    ) {
      return;
    }

    const html = document.documentElement;
    let targetX = -100;
    let targetY = -100;
    let ringX = targetX;
    let ringY = targetY;
    let frame = 0;
    let visible = false;
    let dialogOpen = false;
    let magnet: HTMLElement | null = null;
    let magnetCenter = { x: 0, y: 0 };

    function sync() {
      const show = visible && !dialogOpen;
      html.classList.toggle('custom-cursor', show);
      root!.dataset.hidden = String(!show);
    }

    function releaseMagnet() {
      if (magnet) magnet.style.transform = '';
      magnet = null;
    }

    function tick() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      const dx = targetX - ringX;
      const dy = targetY - ringY;
      const speed = Math.hypot(dx, dy);

      // The further the ring lags behind the dot, the more it stretches along that direction.
      const calm = root!.dataset.mode === 'tile' ? 0.4 : 1;
      const amount = Math.min(speed / 110, 0.4) * calm;
      stretch!.style.transform =
        amount > 0.01
          ? `rotate(${Math.atan2(dy, dx)}rad) scale(${1 + amount}, ${1 - amount * 0.5})`
          : '';

      dot!.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      ring!.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

      frame = speed < 0.1 ? 0 : requestAnimationFrame(tick);
      if (!frame) stretch!.style.transform = '';
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

      // Magnetic elements shift a little toward the pointer, measured from where they rest.
      const nextMagnet = el?.closest<HTMLElement>('[data-magnetic]') ?? null;
      if (nextMagnet !== magnet) {
        releaseMagnet();
        if (nextMagnet) {
          const rect = nextMagnet.getBoundingClientRect();
          magnetCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          magnet = nextMagnet;
        }
      }
      if (magnet) {
        const mx = (e.clientX - magnetCenter.x) * 0.22;
        const my = (e.clientY - magnetCenter.y) * 0.32;
        magnet.style.transform = `translate(${mx.toFixed(1)}px, ${my.toFixed(1)}px)`;
      }

      start();
    }

    function onDown(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      root!.dataset.down = 'true';
      if (dialogOpen) return;
      const ripple = document.createElement('span');
      ripple.className = 'cursor-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      ripple.addEventListener('animationend', () => ripple.remove());
      rippleHost!.appendChild(ripple);
    }

    const onUp = () => {
      root.dataset.down = 'false';
    };
    const onLeave = () => {
      visible = false;
      releaseMagnet();
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
      releaseMagnet();
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
      <div ref={rippleHostRef} />
      <div ref={ringRef} className="cursor-follow">
        <div ref={stretchRef} className="cursor-stretch">
          <div className="cursor-ring" />
        </div>
        <span className="cursor-label">Download</span>
      </div>
      <div ref={dotRef} className="cursor-follow">
        <div className="cursor-dot" />
      </div>
    </div>
  );
}
