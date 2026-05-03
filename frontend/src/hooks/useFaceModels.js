import { useCallback, useState } from 'react';
import * as faceapi from 'face-api.js';

/** Upstream weights (no local hosting required — works offline only if bundled to /public/models). */
const CDN_WEIGHTS =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@v0.22.2/weights';

let loadPromise;

async function loadAllWeights() {
  const local = `${import.meta.env.BASE_URL || '/'}models`;
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(local),
      faceapi.nets.faceLandmark68Net.loadFromUri(local),
      faceapi.nets.faceRecognitionNet.loadFromUri(local),
    ]);
  } catch {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(CDN_WEIGHTS),
      faceapi.nets.faceLandmark68Net.loadFromUri(CDN_WEIGHTS),
      faceapi.nets.faceRecognitionNet.loadFromUri(CDN_WEIGHTS),
    ]);
  }
}

export function ensureFaceModelsLoaded() {
  if (!loadPromise) loadPromise = loadAllWeights();
  return loadPromise;
}

export function useFaceModels() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const ensureModels = useCallback(async () => {
    if (ready) return;
    try {
      await ensureFaceModelsLoaded();
      setReady(true);
    } catch (e) {
      const msg =
        e?.message ||
        'Face models failed to load. Check network or add weights under public/models.';
      setError(msg);
      throw new Error(msg);
    }
  }, [ready]);

  return { modelsReady: ready, modelError: error, ensureModels };
}
