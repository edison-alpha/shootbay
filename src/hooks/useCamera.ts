import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../types/game';

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  captureCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  profilePhoto: string | null;
  cameraReady: boolean;
  cameraError: string;
  capturePhoto: () => void;
  setProfilePhoto: (photo: string | null) => void;
  setCameraError: (error: string) => void;
}

/**
 * Encapsulates camera access, stream lifecycle, and photo capture.
 * The stream is started when `gameState === 'photoCapture'` and
 * torn down on any other state.
 */
export function useCamera(gameState: GameState): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // ── Stream lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'photoCapture') {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      setCameraReady(false);
      return;
    }

    let active = true;

    const startCamera = async () => {
      try {
        setCameraError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        if (active) {
          setCameraError('Kamera belum bisa diakses. Izinkan kamera untuk lanjut mengambil foto profil.');
          setCameraReady(false);
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [gameState]);

  // ── Capture a square crop from the video feed ─────────────────────
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    setProfilePhoto(canvas.toDataURL('image/png'));
  };

  return {
    videoRef,
    captureCanvasRef,
    profilePhoto,
    cameraReady,
    cameraError,
    capturePhoto,
    setProfilePhoto,
    setCameraError,
  };
}
