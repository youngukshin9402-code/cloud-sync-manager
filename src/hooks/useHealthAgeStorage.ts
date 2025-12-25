/**
 * 건강나이 결과 저장 훅 - localStorage 기반 (사용자별 분리)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // 사용자별 스토리지 키 생성 - useMemo로 안정화
  const storageKey = useMemo(() => {
    if (!user?.id) return null;
    return `${STORAGE_KEY_PREFIX}${user.id}`;
  }, [user?.id]);

  // localStorage에서 값 로드하는 함수
  const loadFromStorage = useCallback(() => {
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
  }, [storageKey]);

  // 사용자 변경 시 즉시 상태 초기화 및 새 데이터 로드
  useEffect(() => {
    // 사용자가 없으면 즉시 null로 설정
    if (!user?.id) {
      setResult(null);
      return;
    }
    
    // 새 사용자의 데이터 로드
    loadFromStorage();
  }, [user?.id, loadFromStorage]);

  // 다른 탭/컴포넌트에서 변경 시 실시간 동기화
  useEffect(() => {
    if (!storageKey) return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
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
  }, [loadFromStorage, storageKey]);

  // 저장
  const saveResult = useCallback((data: Omit<HealthAgeResult, 'savedAt'>) => {
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
  }, [storageKey]);

  // 삭제
  const clearResult = useCallback(() => {
    if (!storageKey) return;

    try {
      localStorage.removeItem(storageKey);
      setResult(null);
      // 같은 탭 내 다른 컴포넌트에 변경 알림
      window.dispatchEvent(new Event('healthAgeStorageChange'));
    } catch (e) {
      console.error('Failed to clear health age result:', e);
    }
  }, [storageKey]);

  return { result, saveResult, clearResult };
}
