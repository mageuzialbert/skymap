'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, Check, SwitchCamera, Loader2, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  // Start/stop the camera stream when the modal opens/closes or facing changes
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };

    const startStream = async () => {
      setStarting(true);
      setError(null);
      stopStream();

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Your browser does not support camera access. Try uploading from gallery instead.');
        setStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStarting(false);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError('Camera permission denied. Allow access in your browser settings and try again.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera detected on this device.');
        } else if (name === 'NotReadableError') {
          setError('Camera is busy - close any other app using it and try again.');
        } else {
          setError('Could not open the camera. Try again or use gallery upload.');
        }
        setStarting(false);
      }
    };

    startStream();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facing]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `package-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.92,
    );
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  const handleConfirm = () => {
    if (!previewFile) return;
    onCapture(previewFile);
    handleClose();
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setError(null);
    setStarting(true);
    onClose();
  };

  const handleSwitchCamera = () => {
    setFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="Take a photo">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={handleClose}
          className="p-2.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors cursor-pointer"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white text-sm font-semibold drop-shadow">
          {previewUrl ? 'Review photo' : 'Take photo'}
        </h2>
        {!previewUrl && !error ? (
          <button
            type="button"
            onClick={handleSwitchCamera}
            className="p-2.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors cursor-pointer"
            aria-label="Switch camera"
            disabled={starting}
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-[42px]" />
        )}
      </div>

      {/* Camera view / Preview / Error */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="text-center text-white px-6 max-w-sm">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Captured preview"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin mb-3" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {previewUrl ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 max-w-[180px] px-5 py-3 bg-white/15 backdrop-blur-md border border-white/30 text-white font-semibold rounded-2xl active:scale-[0.98] transition-transform cursor-pointer"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-black/40 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>Use photo</span>
            </button>
          </div>
        ) : !error ? (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={starting}
              aria-label="Capture photo"
              className="relative w-20 h-20 rounded-full bg-white shadow-2xl active:scale-95 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-1 rounded-full ring-4 ring-inset ring-black/10" />
              <span className="absolute inset-2 rounded-full bg-white" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold rounded-2xl"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
