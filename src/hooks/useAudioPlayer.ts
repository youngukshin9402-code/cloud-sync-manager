/**
 * 오디오 재생 추상화 레이어
 * 웹(Audio API) / 앱(RN expo-av) 공통 인터페이스
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AudioPlayer {
  play: (audioUrl: string, bucket?: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  currentUrl: string | null;
  error: string | null;
}

// 웹 환경용 Audio API 플레이어
function createWebAudioPlayer(): {
  play: (signedUrl: string) => Promise<void>;
  stop: () => void;
  onEnded: (callback: () => void) => void;
} {
  let audioElement: HTMLAudioElement | null = null;
  let endedCallback: (() => void) | null = null;

  return {
    play: async (signedUrl: string) => {
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
      audioElement = new Audio(signedUrl);
      audioElement.onended = () => {
        endedCallback?.();
        audioElement = null;
      };
      audioElement.onerror = () => {
        endedCallback?.();
        audioElement = null;
      };
      await audioElement.play();
    },
    stop: () => {
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
        endedCallback?.();
      }
    },
    onEnded: (callback: () => void) => {
      endedCallback = callback;
    }
  };
}

/**
 * 오디오 재생 훅
 * @param bucket - Supabase Storage 버킷 이름 (기본값: 'voice-files')
 * @returns AudioPlayer 인터페이스
 */
export function useAudioPlayer(bucket: string = 'voice-files'): AudioPlayer {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef(createWebAudioPlayer());

  const play = useCallback(async (audioPath: string, overrideBucket?: string) => {
    setError(null);
    
    // 같은 파일 재생 중이면 정지
    if (isPlaying && currentUrl === audioPath) {
      playerRef.current.stop();
      setIsPlaying(false);
      setCurrentUrl(null);
      return;
    }

    try {
      // Signed URL 생성
      const targetBucket = overrideBucket || bucket;
      const { data, error: signedUrlError } = await supabase.storage
        .from(targetBucket)
        .createSignedUrl(audioPath, 3600);

      if (signedUrlError || !data?.signedUrl) {
        throw new Error(signedUrlError?.message || '오디오 URL 생성 실패');
      }

      // 이전 재생 정지
      playerRef.current.stop();

      // 종료 콜백 설정
      playerRef.current.onEnded(() => {
        setIsPlaying(false);
        setCurrentUrl(null);
      });

      // 재생 시작
      await playerRef.current.play(data.signedUrl);
      setIsPlaying(true);
      setCurrentUrl(audioPath);
    } catch (err) {
      console.error('Audio play error:', err);
      setError(err instanceof Error ? err.message : '재생 실패');
      setIsPlaying(false);
      setCurrentUrl(null);
    }
  }, [bucket, isPlaying, currentUrl]);

  const stop = useCallback(() => {
    playerRef.current.stop();
    setIsPlaying(false);
    setCurrentUrl(null);
  }, []);

  return {
    play,
    stop,
    isPlaying,
    currentUrl,
    error
  };
}

/**
 * React Native 앱 전환 시 구현 예시:
 * 
 * import { Audio } from 'expo-av';
 * 
 * function createRNAudioPlayer() {
 *   let sound: Audio.Sound | null = null;
 *   let endedCallback: (() => void) | null = null;
 * 
 *   return {
 *     play: async (signedUrl: string) => {
 *       if (sound) {
 *         await sound.unloadAsync();
 *         sound = null;
 *       }
 *       const { sound: newSound } = await Audio.Sound.createAsync(
 *         { uri: signedUrl },
 *         { shouldPlay: true }
 *       );
 *       sound = newSound;
 *       sound.setOnPlaybackStatusUpdate((status) => {
 *         if (status.didJustFinish) {
 *           endedCallback?.();
 *         }
 *       });
 *     },
 *     stop: async () => {
 *       if (sound) {
 *         await sound.stopAsync();
 *         await sound.unloadAsync();
 *         sound = null;
 *         endedCallback?.();
 *       }
 *     },
 *     onEnded: (callback: () => void) => {
 *       endedCallback = callback;
 *     }
 *   };
 * }
 */
