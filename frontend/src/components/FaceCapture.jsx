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

function waitWithTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

function waitForVideoReady(video, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Camera took too long to start')),
      timeoutMs
    );
    function check() {
      if (video?.readyState >= 2 && video?.videoWidth > 0) {
        clearTimeout(timeout);
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    }
    check();
  });
}

export function FaceCapture({
  buttonLabel,
  disabled,
  onDescriptor,
  onError,
  cameraId,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { ensureModels } = useFaceModels();
  const [status, setStatus] = useState('idle'); // idle | requesting | capturing | processing | nosupport
  const [msg, setMsg] = useState('');

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const v = videoRef.current;
      if (v) {
        v.srcObject = null;
      }
      setStatus('idle');
      setMsg('');
    }
  }, [cameraId]);

  async function ensureCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('nosupport');
      setMsg('Camera not supported on this browser');
      throw new Error('no camera api');
    }
    setStatus('requesting');
    const video = cameraId
      ? { deviceId: { exact: cameraId }, width: 640, height: 480 }
      : { facingMode: 'user', width: 640, height: 480 };
    const stream = await navigator.mediaDevices.getUserMedia({
      video,
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

      // Wait until video is actually streaming real frames before grabbing descriptor
      const v = videoRef.current;
      await waitForVideoReady(v);

      const descriptor = await grabDescriptor(v);
      if (!descriptor) {
        throw new Error('No face detected. Center your face with good lighting.');
      }
      setStatus('processing');
      await waitWithTimeout(
        Promise.resolve(onDescriptor?.(descriptor)),
        30000,
        'Attendance request timed out. Please try again.'
      );
      setMsg('Captured — processing…');
      setTimeout(() => setMsg(''), 2500);
      setStatus('capturing');
    } catch (e) {
      const text = e?.message || 'Capture failed';
      setMsg(text);
      onError?.(text);
      setStatus(streamRef.current ? 'capturing' : 'idle');
      return;
    }
  }

  const busy = !!disabled || status === 'requesting' || status === 'processing';

  return (
    <div className="space-y-3">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-slate-900 shadow-inner">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {status !== 'capturing' && status !== 'requesting' && status !== 'processing' && (
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
        {status === 'processing' ? 'Processing…' : busy ? 'Please wait…' : buttonLabel || 'Capture & submit'}
      </button>
      {msg && (
        <p className="text-center text-sm text-slate-600" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
