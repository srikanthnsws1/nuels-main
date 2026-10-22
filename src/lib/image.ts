/** Largest data URL we store in a Firestore document (documents are capped at 1 MB). */
export const MAX_IMAGE_CHARS = 850_000;
const MAX_FILE = 15 * 1024 * 1024;

/**
 * Shrinks an image file to fit within `maxSide` px and re-encodes it as a data URL small enough
 * to store in Firestore. Lowers the quality, then the size, until it fits.
 */
export async function compressImage(file: File, { maxSide = 1400, type = "image/jpeg" }: { maxSide?: number; type?: "image/jpeg" | "image/png" } = {}) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file (JPG, PNG or WebP).");
  if (file.size > MAX_FILE) throw new Error("That image is larger than 15 MB. Please choose a smaller one.");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image. Try another file."));
      el.src = url;
    });

    let side = maxSide;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser couldn't process that image.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of type === "image/png" ? [1] : [0.8, 0.65, 0.5]) {
        const data = canvas.toDataURL(type, quality);
        if (data.length <= MAX_IMAGE_CHARS) return data;
      }
      side = Math.round(side * 0.75);
    }
    throw new Error("That image is too large. Please crop it and try again.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
