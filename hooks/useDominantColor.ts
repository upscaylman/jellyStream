// Extrait la couleur dominante d'une image via canvas (web) ou fallback (native)
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const DEFAULT_COLOR = "#202036";

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

/**
 * Extrait la couleur dominante d'une image URL.
 * Retourne un hex string (ex: "#3a1f5e").
 * Fallback sur DEFAULT_COLOR si extraction impossible.
 */
export function useDominantColor(imageUrl: string | undefined): string {
  const [color, setColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    if (!imageUrl) {
      setColor(DEFAULT_COLOR);
      return;
    }

    if (Platform.OS === "web") {
      extractColorWeb(imageUrl)
        .then(setColor)
        .catch(() => setColor(DEFAULT_COLOR));
    } else {
      // Sur native, pas de canvas — fallback couleur par défaut
      setColor(DEFAULT_COLOR);
    }
  }, [imageUrl]);

  return color;
}

async function extractColorWeb(url: string): Promise<string> {
  // Fetch l'image en blob pour contourner les restrictions CORS du canvas
  const response = await fetch(url);
  if (!response.ok) return DEFAULT_COLOR;
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(DEFAULT_COLOR);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Compter les couleurs en les regroupant par buckets de 32
        const buckets = new Map<string, number>();
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          // Ignorer les pixels très sombres ou très clairs
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          if (brightness < 20 || brightness > 230) continue;
          const key = `${r},${g},${b}`;
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }

        if (buckets.size === 0) {
          resolve(DEFAULT_COLOR);
          return;
        }

        // Trouver le bucket le plus fréquent
        let maxCount = 0;
        let dominant = DEFAULT_COLOR;
        for (const [key, count] of buckets) {
          if (count > maxCount) {
            maxCount = count;
            const [r, g, b] = key.split(",").map(Number);
            dominant = rgbToHex(r, g, b);
          }
        }
        resolve(dominant);
      } catch {
        resolve(DEFAULT_COLOR);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(DEFAULT_COLOR);
    };
    img.src = objectUrl;
  });
}
