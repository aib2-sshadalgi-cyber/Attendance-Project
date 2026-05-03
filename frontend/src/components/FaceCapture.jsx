import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useFaceModels } from '../hooks/useFaceModels';

async function grabDescriptor(video) {
  const det = await faceapi
    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!det?.descriptor) return null;
  return Array.from(det.descriptor);
}

export function FaceCapture({
  buttonLabel,
  disabled,
  onDescriptor,
  onError,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { ensureModels } = useFaceModels();
  const [status, setStatus] = useState('idle'); // idle | requesting | capturing | nosupport
  const [msg, setMsg] = useState('');

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function ensureCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('nosupport');
      setMsg('Camera not supported on this browser');
      throw new Error('no camera api');
    }
    setStatus('requesting');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
      audio: false,
    });
    streamRef.current = stream;
    const v = videoRef.current;
    if (v) {
      v.srcObject = stream;
      await v.play();
    }
    setStatus('capturing');
  }

  async function handleClick() {
    setMsg('');
    try {
      await ensureModels();
      if (!streamRef.current) await ensureCamera();
      await new Promise((r) => requestAnimationFrame(r));
      const v = videoRef.current;
      if (!v?.videoWidth) {
        throw new Error('Camera not ready');
      }
      const descriptor = await grabDescriptor(v);
      if (!descriptor) {
        throw new Error('No face detected. Center your face with good lighting.');
      }
      onDescriptor(descriptor);
      setMsg('Captured — processing…');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      const text = e?.message || 'Capture failed';
      setMsg(text);
      onError?.(text);
      if (status === 'nosupport') return;
      setStatus('capturing');
    }
  }

  const busy = !!disabled || status === 'requesting';

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-inner aspect-video flex items-center justify-center">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {status !== 'capturing' && status !== 'requesting' && (
          <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/40 px-3 py-2 text-center text-sm text-white backdrop-blur">
            Grant camera permission to scan face
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={handleClick}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-panel transition hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? 'Please wait…' : buttonLabel || 'Capture & submit'}
      </button>
      {msg && (
        <p className="text-center text-sm text-slate-600" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
