/**
 * Client-side image processing for Wall Vault.
 *
 * Everything here runs in the visitor's browser with the HTML5 canvas API.
 * No serverless function or Node image library is involved, so resizing
 * costs nothing and never touches Vercel's runtime limits.
 */

export type OutputFormat = 'jpeg' | 'png';

/** Largest side we allow. Keeps custom sizes inside what mobile browsers can render. */
export const MAX_SIDE = 8192;
/** iOS Safari caps a canvas at about 16.7 megapixels. */
export const MAX_PIXELS = 16_777_216;

export type Crop = { sx: number; sy: number; sw: number; sh: number };
type Decoded = ImageBitmap | HTMLImageElement;

/**
 * Center-crop rectangle (in source pixels) that matches the target aspect ratio.
 * The result is the largest region of the source with that ratio, centered.
 */
export function computeCrop(srcW: number, srcH: number, dstW: number, dstH: number): Crop {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let sw = srcW;
  let sh = srcH;
  if (srcRatio > dstRatio) {
    sw = srcH * dstRatio; // source is wider than target: trim the sides
  } else {
    sh = srcW / dstRatio; // source is taller than target: trim top and bottom
  }
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sizeOf(d: Decoded): { w: number; h: number } {
  return d instanceof HTMLImageElement
    ? { w: d.naturalWidth, h: d.naturalHeight }
    : { w: d.width, h: d.height };
}

function release(d: Decoded) {
  if (!(d instanceof HTMLImageElement)) d.close();
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      mime,
      quality,
    );
  });
}

/**
 * Crop + scale into a new canvas. Large reductions are done in halving steps,
 * which keeps detail much better than one big drawImage call.
 */
function renderToCanvas(
  source: Decoded,
  crop: Crop,
  dstW: number,
  dstH: number,
  opaque: boolean,
): HTMLCanvasElement {
  const temps: HTMLCanvasElement[] = [];
  try {
    let current: CanvasImageSource = source;
    let { sx, sy, sw, sh } = crop;

    while (sw / 2 > dstW) {
      const nw = Math.max(dstW, Math.round(sw / 2));
      const nh = Math.max(dstH, Math.round(sh / 2));
      const step = makeCanvas(nw, nh);
      const stepCtx = step.getContext('2d');
      if (!stepCtx) throw new Error('Canvas is not available');
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(current, sx, sy, sw, sh, 0, 0, nw, nh);
      temps.push(step);
      current = step;
      sx = 0;
      sy = 0;
      sw = nw;
      sh = nh;
    }

    const out = makeCanvas(dstW, dstH);
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    if (opaque) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, dstW, dstH);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, sx, sy, sw, sh, 0, 0, dstW, dstH);
    return out;
  } finally {
    for (const c of temps) {
      c.width = 0;
      c.height = 0;
    }
  }
}

/**
 * Download flow: fetch the original, center-crop to the requested aspect ratio,
 * scale to the exact pixel size, and return the encoded image.
 */
export async function renderWallpaper(
  url: string,
  dstW: number,
  dstH: number,
  format: OutputFormat,
  quality = 0.95,
): Promise<Blob> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`Image request failed (${response.status})`);

  const source = await decode(await response.blob());
  try {
    const { w, h } = sizeOf(source);
    const crop = computeCrop(w, h, dstW, dstH);
    const canvas = renderToCanvas(source, crop, dstW, dstH, format === 'jpeg');
    try {
      return await canvasToBlob(
        canvas,
        format === 'png' ? 'image/png' : 'image/jpeg',
        format === 'png' ? undefined : quality,
      );
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    release(source);
  }
}

/** Upload flow: read the real pixel size and build a small JPEG preview for the grid. */
export async function prepareUpload(
  file: File,
  thumbSide = 900,
): Promise<{ width: number; height: number; thumb: Blob }> {
  const source = await decode(file);
  try {
    const { w, h } = sizeOf(source);
    const scale = Math.min(1, thumbSide / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = renderToCanvas(source, { sx: 0, sy: 0, sw: w, sh: h }, tw, th, true);
    try {
      const thumb = await canvasToBlob(canvas, 'image/jpeg', 0.82);
      return { width: w, height: h, thumb };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    release(source);
  }
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'wallpaper'
  );
}

/** Triggers a browser download for a Blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
