/**
 * 건강나이 결과 저장 훅 - localStorage 기반 (사용자별 분리)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY_PREFIX = 'yanggaeng_health_age_result_';

export interface HealthAgeResult {
  actualAge: number;
  healthAge: number;
  bodyScore: number;
  analysis: string;
  recordDate: string;
  savedAt: string;
}

export function useHealthAgeStorage() {
  const { user } = useAuth();
  const [result, setResult] = useState<HealthAgeResult | null>(null);

  // 사용자별 스토리지 키 생성
  const getStorageKey = useCallback(() => {
    if (!user?.id) return null;
    return `${STORAGE_KEY_PREFIX}${user.id}`;
  }, [user?.id]);

  // localStorage에서 값 로드하는 함수
  const loadFromStorage = useCallback(() => {
    const storageKey = getStorageKey();
    if (!storageKey) {
      setResult(null);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setResult(JSON.parse(stored));
      } else {
        setResult(null);
      }
    } catch (e) {
      console.error('Failed to load health age result:', e);
      setResult(null);
    }
  }, [getStorageKey]);

  // 사용자 변경 시 또는 초기 로드
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage, user?.id]);

  // 다른 탭/컴포넌트에서 변경 시 실시간 동기화
  useEffect(() => {
    const storageKey = getStorageKey();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (storageKey && e.key === storageKey) {
        loadFromStorage();
      }
    };

    // 같은 탭 내에서 변경 감지를 위한 커스텀 이벤트
    const handleCustomStorageChange = () => {
      loadFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('healthAgeStorageChange', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('healthAgeStorageChange', handleCustomStorageChange);
    };
  }, [loadFromStorage, getStorageKey]);

  // 저장
  const saveResult = useCallback((data: Omit<HealthAgeResult, 'savedAt'>) => {
    const storageKey = getStorageKey();
    if (!storageKey) {
      console.error('Cannot save health age result: user not logged in');
      return;
    }

    const toSave: HealthAgeResult = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(toSave));
      setResult(toSave);
      // 같은 탭 내 다른 컴포넌트에 변경 알림
      window.dispatchEvent(new Event('healthAgeStorageChange'));
    } catch (e) {
      console.error('Failed to save health age result:', e);
    }
  }, [getStorageKey]);

  // 삭제
  const clearResult = useCallback(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      localStorage.removeItem(storageKey);
      setResult(null);
      // 같은 탭 내 다른 컴포넌트에 변경 알림
      window.dispatchEvent(new Event('healthAgeStorageChange'));
    } catch (e) {
      console.error('Failed to clear health age result:', e);
    }
  }, [getStorageKey]);

  return { result, saveResult, clearResult };
}
