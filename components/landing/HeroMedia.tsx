'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import HeroSlider from './HeroSlider';
import { useT } from '@/lib/i18n';

const VOICE_SRC =
  'https://ergemtnsxdvbboyjxdyy.supabase.co/storage/v1/object/public/assets/audio/skymap-audio.mp3';

/**
 * Hero media for the landing page: the admin-managed image slideshow with an
 * optional background voice-over the visitor can toggle from the top-left.
 */
export default function HeroMedia({ height = 'fill' }: { height?: 'fill' }) {
  const t = useT();
  const [voicePlaying, setVoicePlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // Pause voice when unmounting.
  useEffect(() => () => stopVoice(), [stopVoice]);

  return (
    <div className="relative w-full h-full">
      <HeroSlider height={height} />

      {/* Background voice-over */}
      <audio ref={audioRef} src={VOICE_SRC} preload="auto" loop />

      {/* Sound toggle (top-left) */}
      <div className="absolute top-3 left-3 z-20">
        <button
          onClick={() => (voicePlaying ? stopVoice() : startVoice())}
          className="p-2.5 bg-black/40 hover:bg-black/55 backdrop-blur-sm rounded-xl text-white active:scale-95 transition"
          aria-label={voicePlaying ? t('landing.muteAudio') : t('landing.playAudio')}
          title={voicePlaying ? t('landing.muteAudio') : t('landing.playAudio')}
        >
          {voicePlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
