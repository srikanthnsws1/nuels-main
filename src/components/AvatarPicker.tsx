"use client";

import { useEffect, useRef, useState } from "react";
import ImageCropper from "./ImageCropper";

const MAX_FILE = 8 * 1024 * 1024;

/**
 * Profile photo picker: choose an image, crop it freely, then Save. Produces a small JPEG
 * data URL (well under the 200 KB the security rules allow for profile photos).
 */
export default function AvatarPicker({
  value,
  onChange,
  label = "Profile Picture",
  optional = true,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  optional?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!src) return;
    return () => URL.revokeObjectURL(src);
  }, [src]);

  const pick = (file?: File) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file (JPG, PNG or WebP).");
    if (file.size > MAX_FILE) return setError("That image is larger than 8 MB. Please choose a smaller one.");
    setSrc(URL.createObjectURL(file));
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-forest-900">
        {label} {optional && <span className="font-normal text-slate-400">(optional)</span>}
      </span>

      {src ? (
        <ImageCropper
          src={src}
          squareStart
          maxSide={400}
          maxChars={190_000}
          onCancel={() => setSrc(null)}
          onSave={(data) => {
            onChange(data);
            setSrc(null);
          }}
        />
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
