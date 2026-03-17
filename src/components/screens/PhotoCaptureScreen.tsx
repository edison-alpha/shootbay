import React from 'react';

interface PhotoCaptureScreenProps {
  playerName: string;
  profilePhoto: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  captureCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraReady: boolean;
  cameraError: string;
  onCapture: () => void;
  onRetake: () => void;
  onContinue: () => void;
}

export const PhotoCaptureScreen: React.FC<PhotoCaptureScreenProps> = ({
  playerName,
  profilePhoto,
  videoRef,
  captureCanvasRef,
  cameraReady,
  cameraError,
  onCapture,
  onRetake,
  onContinue,
}) => (
  <div
    className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    style={{
      padding: 'max(16px, env(safe-area-inset-top, 16px)) max(16px, env(safe-area-inset-right, 16px)) max(16px, env(safe-area-inset-bottom, 16px)) max(16px, env(safe-area-inset-left, 16px))',
    }}
  >
    <div className="flex max-h-full w-full max-w-md flex-col rounded-[32px] border border-white/10 bg-[#171717]/95 p-5 shadow-2xl sm:p-6">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-yellow-400">Foto Profil</div>
      <h2 className="mb-2 text-2xl font-black text-white">Ciss foto dulu</h2>
      <p className="mb-5 text-sm leading-6 text-zinc-400">
        Izinkan akses kamera, lalu ambil foto. Hasil foto ini akan dipakai sebagai profile game untuk {playerName}.
      </p>

      {/* Video always mounted so ref stays alive for retake */}
      <div className="relative mx-auto mb-4 aspect-square w-full max-w-[280px] shrink-0 overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900 sm:max-w-[320px]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full scale-x-[-1] object-cover ${profilePhoto ? 'invisible' : ''}`}
        />
        {profilePhoto && (
          <img
            src={profilePhoto}
            alt="Profile preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/10 ring-1 ring-inset ring-white/10" />
      </div>

      <canvas ref={captureCanvasRef} className="hidden" />

      {cameraError && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {cameraError}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {!profilePhoto ? (
          <button
            onClick={onCapture}
            disabled={!cameraReady}
            className="w-full rounded-2xl border border-white/10 bg-white/8 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ambil Foto
          </button>
        ) : (
          <>
            <button
              onClick={onRetake}
              className="w-full rounded-2xl border border-white/10 bg-white/8 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/15"
            >
              Ambil Ulang Foto
            </button>
            <button
              onClick={onContinue}
              className="w-full rounded-2xl bg-yellow-500 py-3 text-sm font-black uppercase tracking-[0.22em] text-black transition hover:bg-yellow-400"
            >
              Lanjutkan
            </button>
          </>
        )}
      </div>
    </div>
  </div>
);
