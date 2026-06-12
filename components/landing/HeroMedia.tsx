'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Film, Images } from 'lucide-react';
import HeroSlider from './HeroSlider';
import { useT } from '@/lib/i18n';

interface HomeVideo {
  id: string;
  title: string | null;
  video_url: string;
  poster_url: string | null;
}

type Mode = 'video' | 'slides';

const VOICE_SRC =
  'https://ergemtnsxdvbboyjxdyy.supabase.co/storage/v1/object/public/assets/audio/skymap-audio.mp3';

// Rotating hero taglines - derived from the About Us copy.
const PHRASES = [
  'Connecting People, Deliveries & Destinations',
  'Rides, deliveries, hire & errands - all in one app',
  'Fast, safe & reliable transport across Tanzania',
  'Boda, Bajaj, Electric or Car - your choice',
  'Pickups from airports, markets, bus stands & more',
  'Simplifying mobility & logistics for everyone',
];

/** Typewriter that types a phrase, holds, deletes, then advances (loops). */
function useTypewriter(
  phrases: string[],
  opts: { typeMs?: number; deleteMs?: number; holdMs?: number } = {}
) {
  const { typeMs = 55, deleteMs = 28, holdMs = 1600 } = opts;
  const [text, setText] = useState('');
  const [idx, setIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: show a static phrase, no typing.
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setText(phrases[idx % phrases.length] || '');
      return;
    }

    const full = phrases[idx % phrases.length] || '';
    let timer: ReturnType<typeof setTimeout>;
    if (!deleting && text === full) {
      timer = setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && text === '') {
      setDeleting(false);
      setIdx((i) => (i + 1) % phrases.length);
    } else {
      const next = deleting ? full.slice(0, text.length - 1) : full.slice(0, text.length + 1);
      timer = setTimeout(() => setText(next), deleting ? deleteMs : typeMs);
    }
    return () => clearTimeout(timer);
  }, [text, deleting, idx, phrases, typeMs, deleteMs, holdMs]);

  return text;
}

/**
 * Hero media orchestrator for the landing page.
 *
 * - Video plays by default (muted autoplay so browsers allow it).
 * - A switch button toggles to the image slideshow, which plays together with
 *   the background voice-over.
 * - If the user never switches, once the last video ends (and there is no next
 *   video) it automatically falls back to the slideshow.
 * - If no videos are configured, it shows the slideshow immediately.
 */
export default function HeroMedia({ height = 'fill' }: { height?: 'fill' }) {
  const t = useT();
  const [videos, setVideos] = useState<HomeVideo[]>([]);
  const [loadedVideos, setLoadedVideos] = useState(false);
  const [mode, setMode] = useState<Mode>('video');
  const [currentVideo, setCurrentVideo] = useState(0);

  const [videoMuted, setVideoMuted] = useState(true);
  const [voicePlaying, setVoicePlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch admin-managed videos; fall back to slides when there are none.
  useEffect(() => {
    let active = true;
    fetch('/api/cms/videos', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: HomeVideo[]) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setVideos(list);
        setMode(list.length > 0 ? 'video' : 'slides');
        setLoadedVideos(true);
      })
      .catch(() => {
        if (!active) return;
        setVideos([]);
        setMode('slides');
        setLoadedVideos(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Start/stop the voice-over to match the current mode.
  const startVoice = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio
      .play()
      .then(() => setVoicePlaying(true))
      .catch(() => setVoicePlaying(false));
  }, []);

  const stopVoice = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setVoicePlaying(false);
  }, []);

  // When a video ends: advance to the next, or loop the playlist back to the
  // start so the hero video stays on screen (instead of vanishing to slides).
  // A single video uses the native `loop` attribute, so this only runs for
  // multi-video playlists.
  const handleVideoEnded = () => {
    setCurrentVideo((i) => (i < videos.length - 1 ? i + 1 : 0));
  };

  // Switch to slides mode (user gesture) → start the voice-over with sound.
  const switchToSlides = () => {
    videoRef.current?.pause();
    setMode('slides');
    startVoice();
  };

  const switchToVideo = () => {
    stopVoice();
    setMode('video');
    setCurrentVideo(0);
  };

  // Keep the <video> playing the current source.
  useEffect(() => {
    if (mode !== 'video') return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = videoMuted;
    v.play().catch(() => {});
  }, [mode, currentVideo, videoMuted, videos]);

  // Pause voice when unmounting.
  useEffect(() => () => stopVoice(), [stopVoice]);

  const hasVideos = videos.length > 0;
  const showSlides = mode === 'slides' || !hasVideos;
  const typed = useTypewriter(PHRASES);

  return (
    <div className="relative w-full h-full">
      {/* Slides layer */}
      {showSlides ? (
        <HeroSlider height={height} />
      ) : (
        <video
          ref={videoRef}
          key={videos[currentVideo]?.id}
          src={videos[currentVideo]?.video_url}
          poster={videos[currentVideo]?.poster_url || undefined}
          className="w-full h-full object-cover"
          autoPlay
          muted={videoMuted}
          playsInline
          loop={videos.length === 1}
          onEnded={handleVideoEnded}
          onError={() => setMode('slides')}
        />
      )}

      {/* Animated typing tagline over the video (top, centered) */}
      {!showSlides && hasVideos && (
        <div aria-hidden className="absolute top-0 inset-x-0 z-10 pointer-events-none">
          <div className="bg-gradient-to-b from-black/55 via-black/25 to-transparent pt-5 pb-16 px-4 sm:px-6 text-center">
            <p className="text-[11px] sm:text-sm font-bold tracking-[0.3em] uppercase animate-text-shimmer">
              The Skymap
            </p>
            <h2 className="font-bodoni mt-2 animate-text-wave text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight min-h-[2.4em] max-w-4xl mx-auto [text-shadow:0_2px_14px_rgba(0,0,0,0.7)]">
              {typed}
              <span className="animate-caret text-secondary ml-1">|</span>
            </h2>
          </div>
        </div>
      )}

      {/* Background voice-over (only audible in slides mode) */}
      <audio ref={audioRef} src={VOICE_SRC} preload="auto" loop />

      {/* Controls dock (top-right of the media area) */}
      {loadedVideos && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {/* Sound control: video unmute, or voice toggle in slides mode */}
          {showSlides ? (
            <button
              onClick={() => (voicePlaying ? stopVoice() : startVoice())}
              className="p-2.5 bg-black/40 hover:bg-black/55 backdrop-blur-sm rounded-xl text-white active:scale-95 transition"
              aria-label={voicePlaying ? t('landing.muteAudio') : t('landing.playAudio')}
              title={voicePlaying ? t('landing.muteAudio') : t('landing.playAudio')}
            >
              {voicePlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          ) : (
            <button
              onClick={() => setVideoMuted((m) => !m)}
              className="p-2.5 bg-black/40 hover:bg-black/55 backdrop-blur-sm rounded-xl text-white active:scale-95 transition"
              aria-label={videoMuted ? t('landing.playAudio') : t('landing.muteAudio')}
              title={videoMuted ? t('landing.playAudio') : t('landing.muteAudio')}
            >
              {videoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          )}

          {/* Switch between video and slides (only when videos exist) */}
          {hasVideos && (
            <button
              onClick={showSlides ? switchToVideo : switchToSlides}
              className="flex items-center gap-1.5 px-3 py-2 bg-black/40 hover:bg-black/55 backdrop-blur-sm rounded-xl text-white text-xs font-semibold active:scale-95 transition"
            >
              {showSlides ? (
                <>
                  <Film className="w-4 h-4" />
                  <span>{t('landing.watchVideo')}</span>
                </>
              ) : (
                <>
                  <Images className="w-4 h-4" />
                  <span>{t('landing.viewSlides')}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
