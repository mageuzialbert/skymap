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
    fetch('/api/cms/videos')
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

  // When a video ends: advance to the next, or fall back to slides.
  const handleVideoEnded = () => {
    if (currentVideo < videos.length - 1) {
      setCurrentVideo((i) => i + 1);
    } else {
      setMode('slides');
    }
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
          onEnded={handleVideoEnded}
        />
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
