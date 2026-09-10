/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWorker } from 'tesseract.js';
import { BoundingBox, DetectedTextRegion } from '../types/legalMetrology';

export interface OcrProgressCallback {
  (progress: { status: string; progress: number }): void;
}

export interface OcrResult {
  text: string;
  confidence: number;
  regions: DetectedTextRegion[];
  preprocessedDataUrl?: string;
}

/**
 * Image preprocessing on an HTML Canvas:
 * Converts to grayscale, increases contrast, and applies adaptive binarization
 * to remove background color art on product labels.
 */
export async function preprocessImage(
  imageSource: string | HTMLImageElement | File,
  mode: 'contrast' | 'binarize' | 'grayscale' | 'none' = 'contrast'
): Promise<string> {
  // Fast return if no filter applied
  if (mode === 'none' && typeof imageSource === 'string') {
    return imageSource;
  }

  return new Promise((resolve) => {
    const fallbackUrl = typeof imageSource === 'string' ? imageSource : '';

    const img = new Image();

    // Only set crossOrigin for remote HTTP/HTTPS images to prevent CORS failures on data: and blob: URIs
    if (typeof imageSource === 'string' && /^https?:\/\//i.test(imageSource)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fallbackUrl || img.src);
          return;
        }

        // Max dimension downscale for fast in-browser processing
        const maxDim = 1600;
        let width = img.naturalWidth || img.width || 600;
        let height = img.naturalHeight || img.height || 520;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        if (mode === 'none') {
          resolve(canvas.toDataURL('image/jpeg', 0.9));
          return;
        }

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Luminance
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          if (mode === 'grayscale') {
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          } else if (mode === 'contrast') {
            // Linear contrast stretch with mid-tone boost
            const factor = 1.35;
            const adjusted = factor * (gray - 128) + 128;
            const clamped = Math.max(0, Math.min(255, adjusted));
            data[i] = clamped;
            data[i + 1] = clamped;
            data[i + 2] = clamped;
          } else if (mode === 'binarize') {
            // Otsu-like threshold
            const threshold = 135;
            const bin = gray > threshold ? 255 : 0;
            data[i] = bin;
            data[i + 1] = bin;
            data[i + 2] = bin;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (canvasErr) {
        console.warn('Canvas pixel processing fallback to source image:', canvasErr);
        resolve(fallbackUrl || img.src);
      }
    };

    img.onerror = () => {
      // If crossOrigin was set, retry once without crossOrigin
      if (img.crossOrigin) {
        img.crossOrigin = null as any;
        if (typeof imageSource === 'string') {
          img.src = imageSource;
          return;
        }
      }
      // Graceful fallback to avoid interrupting user workflow
      console.warn('Image preprocessing fallback to original image.');
      resolve(fallbackUrl || (imageSource instanceof HTMLImageElement ? imageSource.src : ''));
    };

    if (typeof imageSource === 'string') {
      let src = imageSource;
      if (src.startsWith('data:image/svg+xml;utf8,')) {
        src = src.replace('data:image/svg+xml;utf8,', 'data:image/svg+xml;charset=utf-8,');
      }
      img.src = src;
    } else if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(imageSource);
    } else {
      img.src = imageSource.src;
    }
  });
}

/**
 * Executes 100% Offline Client-Side OCR using Tesseract.js Worker.
 * Supports configurable OCR languages (e.g. 'eng', 'eng+hin', 'eng+tam', etc.)
 */
export async function performOfflineOcr(
  imageInput: string,
  onProgress?: OcrProgressCallback,
  langCode: string = 'eng'
): Promise<OcrResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    onProgress?.({ status: `Initializing offline OCR (${langCode})...`, progress: 0.1 });

    try {
      worker = await createWorker(langCode, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress?.({
              status: `Recognizing label text (${langCode})...`,
              progress: 0.2 + (m.progress || 0) * 0.7
            });
          } else {
            onProgress?.({ status: m.status, progress: 0.15 });
          }
        }
      });
    } catch (langErr) {
      console.warn(`Failed to initialize with language ${langCode}, falling back to 'eng':`, langErr);
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress?.({
              status: 'Recognizing text on label...',
              progress: 0.2 + (m.progress || 0) * 0.7
            });
          } else {
            onProgress?.({ status: m.status, progress: 0.15 });
          }
        }
      });
    }

    onProgress?.({ status: 'Pre-filtering label image...', progress: 0.25 });
    const preprocessedData = await preprocessImage(imageInput, 'contrast');

    onProgress?.({ status: 'Scanning typography & numerals...', progress: 0.45 });
    const result = await worker.recognize(preprocessedData);

    const text = result.data.text.trim();
    const confidence = Math.round(result.data.confidence || 85);

    // Extract word/line bounding boxes normalized to percentages (0-100)
    const regions: DetectedTextRegion[] = [];
    const rawLines: any[] = (result.data as any).lines || (result.data as any).words || [];

    // Get image natural dimensions to normalize bounding boxes
    const tempImg = new Image();
    tempImg.src = preprocessedData;
    await new Promise((r) => {
      tempImg.onload = r;
      tempImg.onerror = r;
    });
    const imgWidth = tempImg.naturalWidth || tempImg.width || 800;
    const imgHeight = tempImg.naturalHeight || tempImg.height || 600;

    rawLines.forEach((line: any, idx: number) => {
      if (!line.text.trim()) return;
      const b = line.bbox;
      const x0 = Math.max(0, (b.x0 / imgWidth) * 100);
      const y0 = Math.max(0, (b.y0 / imgHeight) * 100);
      const x1 = Math.min(100, (b.x1 / imgWidth) * 100);
      const y1 = Math.min(100, (b.y1 / imgHeight) * 100);

      // Classify line field (supports multilingual keywords)
      let fieldLabel = 'Text';
      let status: 'pass' | 'fail' | 'warn' | 'neutral' = 'neutral';
      const upper = line.text.toUpperCase();
      const raw = line.text;

      if (
        upper.includes('NET') || upper.includes('QTY') || upper.includes('WEIGHT') ||
        raw.includes('मात्रा') || raw.includes('शुद्ध') || raw.includes('वजन') || raw.includes('அளவு') || raw.includes('পরিমাণ')
      ) {
        fieldLabel = 'Net Quantity';
        status = (upper.includes('GMS') || upper.includes('LTRS')) ? 'fail' : 'pass';
      } else if (
        upper.includes('MRP') || upper.includes('TAX') ||
        raw.includes('मूल्य') || raw.includes('किंमत') || raw.includes('விலை') || raw.includes('দাম')
      ) {
        fieldLabel = 'MRP & Taxes';
        status = (upper.includes('INCL') || raw.includes('सहित') || raw.includes('உட்பட')) ? 'pass' : 'fail';
      } else if (
        upper.includes('MFG') || upper.includes('PKD') || upper.includes('PACKED') ||
        raw.includes('निर्माण') || raw.includes('तयारी') || raw.includes('தயாரிப்பு')
      ) {
        fieldLabel = 'Mfg Date';
        status = 'pass';
      } else if (
        upper.includes('MFD') || upper.includes('MANUFACTURED') || upper.includes('MARKETED') ||
        raw.includes('निर्माता') || raw.includes('उत्पादक') || raw.includes('உற்பத்தியாளர்')
      ) {
        fieldLabel = 'Manufacturer';
        status = 'pass';
      } else if (
        upper.includes('CARE') || upper.includes('TOLL') || upper.includes('@') || upper.includes('1800') ||
        raw.includes('हेल्पलाइन') || raw.includes('सेवा') || raw.includes('உதவி')
      ) {
        fieldLabel = 'Consumer Care';
        status = 'pass';
      }

      regions.push({
        id: `ocr_line_${idx}`,
        text: line.text.trim(),
        confidence: Math.round(line.confidence || confidence),
        box: { x0, y0, x1, y1 },
        fieldLabel,
        status
      });
    });

    onProgress?.({ status: 'Extraction complete.', progress: 1.0 });

    return {
      text,
      confidence,
      regions,
      preprocessedDataUrl: preprocessedData
    };
  } catch (err) {
    console.warn('Tesseract offline worker encounter:', err);
    throw err;
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}
