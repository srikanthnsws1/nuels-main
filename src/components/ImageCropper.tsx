"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** Crop box as fractions (0–1) of the image, so it survives the preview being resized. */
type Box = { x: number; y: number; w: number; h: number };
type Handle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const MIN_PX = 24; // smallest crop box on screen
const handles: { id: Exclude<Handle, "move">; className: string }[] = [
  { id: "nw", className: "-left-2 -top-2 cursor-nwse-resize" },
  { id: "ne", className: "-right-2 -top-2 cursor-nesw-resize" },
  { id: "sw", className: "-bottom-2 -left-2 cursor-nesw-resize" },
  { id: "se", className: "-bottom-2 -right-2 cursor-nwse-resize" },
  { id: "n", className: "-top-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { id: "s", className: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { id: "w", className: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "e", className: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
];

/** Encodes the cropped area as a JPEG data URL no longer than `maxChars`, shrinking if needed. */
function encode(img: HTMLImageElement, box: Box, maxSide: number, maxChars: number): string | null {
  const sx = box.x * img.naturalWidth;
  const sy = box.y * img.naturalHeight;
  const sw = box.w * img.naturalWidth;
  const sh = box.h * img.naturalHeight;
  for (const [side, quality] of [
    [maxSide, 0.85],
    [maxSide * 0.8, 0.75],
    [maxSide * 0.64, 0.65],
    [maxSide * 0.5, 0.55],
  ]) {
    const scale = Math.min(1, side / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", quality);
    if (data.length <= maxChars) return data;
  }
  return null;
}

/**
 * Freestyle crop: drag the box to move it, drag a corner or edge to resize it to any shape,
 * then Save. Produces a JPEG data URL of at most `maxSide` px on the long side.
 */
export default function ImageCropper({
  src,
  maxSide,
  maxChars,
  squareStart = false,
  onSave,
  onCancel,
}: {
  /** Object URL or data URL of the image to crop. */
  src: string;
  maxSide: number;
  maxChars: number;
  /** Start with a centred square (handy for profile photos); otherwise the whole image. */
  squareStart?: boolean;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 }); // rendered preview size in px
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 1, h: 1 });
  const [error, setError] = useState("");
  const drag = useRef<{ handle: Handle; px: number; py: number; start: Box } | null>(null);

  // Track the preview's rendered size so pointer movement maps onto the image.
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    setSize({ w: el.clientWidth, h: el.clientHeight });
    if (squareStart) {
      const side = Math.min(el.naturalWidth, el.naturalHeight) * 0.9;
      const w = side / el.naturalWidth;
      const h = side / el.naturalHeight;
      setBox({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
    } else {
      setBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    }
  };

  const start = (handle: Handle) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { handle, px: e.clientX, py: e.clientY, start: box };
  };

  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !size.w || !size.h) return;
    const dx = (e.clientX - d.px) / size.w;
    const dy = (e.clientY - d.py) / size.h;
    const minW = MIN_PX / size.w;
    const minH = MIN_PX / size.h;
    const s = d.start;
    let { x, y, w, h } = s;

    if (d.handle === "move") {
      x = Math.min(1 - w, Math.max(0, s.x + dx));
      y = Math.min(1 - h, Math.max(0, s.y + dy));
    } else {
      if (d.handle.includes("w")) {
        x = Math.min(s.x + s.w - minW, Math.max(0, s.x + dx));
        w = s.x + s.w - x;
      }
      if (d.handle.includes("e")) w = Math.min(1 - s.x, Math.max(minW, s.w + dx));
      if (d.handle.includes("n")) {
        y = Math.min(s.y + s.h - minH, Math.max(0, s.y + dy));
        h = s.y + s.h - y;
      }
      if (d.handle.includes("s")) h = Math.min(1 - s.y, Math.max(minH, s.h + dy));
    }
    setBox({ x, y, w, h });
  };

  const end = () => {
    drag.current = null;
  };

  const save = () => {
    const img = imgRef.current;
    if (!img) return;
    const data = encode(img, box, maxSide, maxChars);
    if (!data) return setError("That crop is too large to save. Try a smaller area or a smaller image.");
    onSave(data);
  };

  return (
    <div className="rounded-2xl border border-forest-100 bg-forest-50/60 p-4">
      <div className="flex justify-center">
        <div className="relative touch-none select-none" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
          <img
            ref={imgRef}
            src={src}
            alt="Image to crop"
            draggable={false}
            onLoad={onLoad}
            className="pointer-events-none block max-h-[360px] max-w-full rounded-lg"
          />
          {size.w > 0 && (
            <div
              role="presentation"
              onPointerDown={start("move")}
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(5,26,21,0.55)]"
              style={{ left: box.x * size.w, top: box.y * size.h, width: box.w * size.w, height: box.h * size.h }}
            >
              {/* rule-of-thirds guides */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="border border-white/25" />
                ))}
              </div>
              {handles.map((h) => (
                <span
                  key={h.id}
                  onPointerDown={start(h.id)}
                  aria-hidden
                  className={`absolute h-4 w-4 rounded-full border-2 border-forest-700 bg-white shadow ${h.className}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">Drag the box to move it · drag the corners or edges to crop freely</p>
      {error && <p className="mt-2 text-center text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex justify-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-forest-200 px-5 py-2 text-sm font-semibold text-forest-700 transition hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!size.w}
          className="rounded-full bg-forest-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </div>
  );
}
