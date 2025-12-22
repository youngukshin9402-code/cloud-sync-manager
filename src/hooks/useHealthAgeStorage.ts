/**
 * 건강나이 결과 저장 훅 - localStorage 기반
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'yanggaeng_health_age_result';

export interface HealthAgeResult {
  actualAge: number;
  healthAge: number;
  bodyScore: number;
  analysis: string;
  recordDate: string;
  savedAt: string;
}

export function useHealthAgeStorage() {
  const [result, setResult] = useState<HealthAgeResult | null>(null);

  // 초기 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setResult(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load health age result:', e);
    }
  }, []);

  // 저장
  const saveResult = useCallback((data: Omit<HealthAgeResult, 'savedAt'>) => {
    const toSave: HealthAgeResult = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setResult(toSave);
    } catch (e) {
      console.error('Failed to save health age result:', e);
    }
  }, []);

  // 삭제
  const clearResult = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setResult(null);
    } catch (e) {
      console.error('Failed to clear health age result:', e);
    }
  }, []);

  return { result, saveResult, clearResult };
}
