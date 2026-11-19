const MAX_DIMENSION = 480;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/**
 * Read an image file and downscale it to a compact JPEG data URL so that
 * photos fit comfortably in on-device storage.
 */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo or image file.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is too large. Please choose one under 15 MB.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process this image.');
    ctx.fillStyle = '#FAF8F2';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be opened. Try a JPG or PNG photo.'));
    img.src = src;
  });
}
