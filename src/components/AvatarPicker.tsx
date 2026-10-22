"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const VIEW = 240; // crop window size in CSS px
const OUTPUT = 256; // saved image size in px
const MAX_FILE = 8 * 1024 * 1024;

type Img = { el: HTMLImageElement; w: number; h: number };

/**
 * Profile photo picker with a round crop window: drag to position, zoom with the slider,
 * buttons or mouse wheel. Produces a small JPEG data URL (≈15–40 KB) for the profile.
 */
export default function AvatarPicker({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<Img | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Scale at zoom 1 makes the shorter side fill the crop window.
  const base = img ? VIEW / Math.min(img.w, img.h) : 1;
  const scale = base * zoom;

  // Keep the image covering the whole crop window.
  const clamp = (p: { x: number; y: number }, s = scale) => {
    if (!img) return p;
    const maxX = Math.max(0, (img.w * s - VIEW) / 2);
    const maxY = Math.max(0, (img.h * s - VIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  };

  const setZoomClamped = (z: number) => {
    const next = Math.min(3, Math.max(1, z));
    setZoom(next);
    setPos((p) => clamp(p, base * next));
  };

  const pick = (file?: File) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file (JPG, PNG or WebP).");
    if (file.size > MAX_FILE) return setError("That image is larger than 8 MB. Please choose a smaller one.");
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      setImg({ el, w: el.naturalWidth, h: el.naturalHeight });
      setZoom(1);
      setPos({ x: 0, y: 0 });
    };
    el.onerror = () => setError("Couldn't read that image. Try another file.");
    el.src = url;
  };

  useEffect(() => {
    if (!img) return;
    return () => URL.revokeObjectURL(img.el.src);
  }, [img]);

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const save = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const k = OUTPUT / VIEW;
    const w = img.w * scale * k;
    const h = img.h * scale * k;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.el, OUTPUT / 2 - w / 2 + pos.x * k, OUTPUT / 2 - h / 2 + pos.y * k, w, h);
    onChange(canvas.toDataURL("image/jpeg", 0.85));
    setImg(null);
  };

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-forest-100 bg-white text-lg font-bold text-forest-700 transition hover:bg-forest-50 disabled:opacity-40";

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-forest-900">
        Profile Picture <span className="font-normal text-slate-400">(optional)</span>
      </span>

      {img ? (
        <div className="rounded-2xl border border-forest-100 bg-forest-50/60 p-4">
          <div
            className="relative mx-auto cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-forest-950 active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => setZoomClamped(zoom - e.deltaY * 0.0015)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
            <img
              src={img.el.src}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: img.w * scale,
                height: img.h * scale,
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              }}
            />
            {/* round guide: everything outside the circle is dimmed */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(5,26,21,0.55)] ring-2 ring-white/80" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" className={btn} onClick={() => setZoomClamped(zoom - 0.2)} disabled={zoom <= 1} aria-label="Zoom out">
              −
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoomClamped(Number(e.target.value))}
              aria-label="Zoom"
              className="w-36 accent-forest-700"
            />
            <button type="button" className={btn} onClick={() => setZoomClamped(zoom + 0.2)} disabled={zoom >= 3} aria-label="Zoom in">
              +
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">Drag to position · zoom to fit your face in the circle</p>

          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setImg(null)}
              className="rounded-full border border-forest-200 px-5 py-2 text-sm font-semibold text-forest-700 transition hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-forest-600"
            >
              Use this photo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-forest-100 bg-forest-50 text-forest-300">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL preview
              <img src={value} alt="Your profile picture" className="h-full w-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
              </svg>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-forest-200 bg-white px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
            >
              {value ? "Change photo" : "Upload photo"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-full px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
