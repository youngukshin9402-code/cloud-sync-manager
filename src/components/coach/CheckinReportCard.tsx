/**
 * 체크인 리포트 상세 카드 컴포넌트
 * 5개 카드: 요약, 건강, 영양, 운동, 메모
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Flame, Droplets, Dumbbell, Heart, FileText, ChevronDown, ChevronUp,
  Moon, Smile, Activity, Utensils, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SnapshotData {
  checkin: {
    conditionScore: number;
    sleepHours: number;
  };
  memo: string | null;
  home: {
    calories: { current: number; goal: number; percent: number };
    water: { current: number; goal: number; percent: number };
    healthAge: { actual: number | null; health: number | null } | null;
  };
  health: {
    id: string;
    exam_date: string | null;
    health_age: number | null;
    health_tags: string[] | null;
    parsed_data: any;
    created_at: string;
  } | null;
  nutrition: {
    totalCalories: number;
    macros: { carbs: number; protein: number; fat: number };
    meals: Array<{
      meal_type: string;
      total_calories: number;
      foods: any[];
      image_url: string | null;
      created_at: string;
    }>;
  };
  exercise: {
    records: Array<{
      id: string;
      exercises: any[];
      images: string[] | null;
      created_at: string;
    }>;
  };
  sentAt: string;
  timezone: string;
}

interface CheckinReportCardProps {
  report: {
    id: string;
    user_id: string;
    report_date: string;
    sent_at: string;
    version_number: number;
    summary: any;
    snapshot_data: SnapshotData | null;
    user_nickname?: string;
  };
  compact?: boolean;
}

const conditionEmojis = ['😫', '😕', '😐', '🙂', '😊'];
const conditionLabels = ['매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];

const mealTypeLabels: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export function CheckinReportCard({ report, compact = false }: CheckinReportCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const snapshot = report.snapshot_data;
  const summary = report.summary || {};

  const conditionScore = snapshot?.checkin?.conditionScore || summary?.checkin?.conditionScore || 3;
  const sleepHours = snapshot?.checkin?.sleepHours || summary?.checkin?.sleepHours || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-medium text-sm">
                {report.user_nickname?.[0] || '?'}
              </span>
            </div>
            <span className="truncate">{report.user_nickname || '사용자'}</span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {report.version_number > 1 && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                v{report.version_number}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {format(new Date(report.report_date), 'M/d (E)', { locale: ko })}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          <Clock className="w-3 h-3 inline mr-1" />
          {format(new Date(report.sent_at), 'HH:mm', { locale: ko })} 전송
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 1. 요약 카드 */}
        <div className="bg-muted/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4 text-primary" />
            오늘 요약
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">{conditionEmojis[conditionScore - 1]}</span>
              <span className="text-muted-foreground">컨디션</span>
              <span className="font-medium">{conditionLabels[conditionScore - 1]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="text-muted-foreground">수면</span>
              <span className="font-medium">{sleepHours}시간</span>
            </div>
          </div>
          
          {/* 홈탭 데이터 */}
          {snapshot?.home && (
            <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-medium">
                  {snapshot.home.calories.current.toLocaleString()}/{snapshot.home.calories.goal.toLocaleString()} kcal
                </span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] px-1",
                    snapshot.home.calories.percent >= 80 
                      ? "border-emerald-500 text-emerald-600" 
                      : "border-amber-500 text-amber-600"
                  )}
                >
                  {snapshot.home.calories.percent}%
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-muted-foreground">물</span>
                <span className="font-medium">
                  {snapshot.home.water.current.toLocaleString()}/{snapshot.home.water.goal.toLocaleString()}ml
                </span>
              </div>
            </div>
          )}
        </div>

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  접기
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  상세 보기
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 pt-2">
            {/* 2. 건강 카드 */}
            <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
                <Heart className="w-4 h-4" />
                건강 기록 (최근 1건)
              </div>
              {snapshot?.health ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">검진일:</span>
                    <span className="font-medium">
                      {snapshot.health.exam_date 
                        ? format(new Date(snapshot.health.exam_date), 'yyyy.MM.dd') 
                        : '-'}
                    </span>
                  </div>
                  {snapshot.health.health_age && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">건강나이:</span>
                      <span className="font-medium">{snapshot.health.health_age}세</span>
                    </div>
                  )}
                  {snapshot.health.health_tags && snapshot.health.health_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {snapshot.health.health_tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">건강 기록 없음</p>
              )}
            </div>

            {/* 3. 영양 카드 */}
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300">
                <Utensils className="w-4 h-4" />
                영양 기록 (오늘)
              </div>
              {snapshot?.nutrition ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-4">
                    <span>총 {snapshot.nutrition.totalCalories.toLocaleString()} kcal</span>
                    <span className="text-muted-foreground">
                      탄 {snapshot.nutrition.macros.carbs}g / 
                      단 {snapshot.nutrition.macros.protein}g / 
                      지 {snapshot.nutrition.macros.fat}g
                    </span>
                  </div>
                  {snapshot.nutrition.meals.length > 0 ? (
                    <div className="space-y-2 pt-1 border-t border-orange-200/50">
                      {snapshot.nutrition.meals.map((meal, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {mealTypeLabels[meal.meal_type] || meal.meal_type}
                            </Badge>
                            <span className="font-medium">{meal.total_calories} kcal</span>
                          </div>
                          {meal.foods && meal.foods.length > 0 && (
                            <ul className="text-xs text-muted-foreground pl-4 space-y-0.5">
                              {meal.foods.slice(0, 5).map((food: any, j: number) => (
                                <li key={j}>
                                  • {food.name || '음식'} 
                                  {food.calories ? ` (${food.calories}kcal)` : ''}
                                  {food.portion ? ` - ${food.portion}` : ''}
                                </li>
                              ))}
                              {meal.foods.length > 5 && (
                                <li className="text-muted-foreground">...외 {meal.foods.length - 5}개</li>
                              )}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">식사 기록 없음</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">영양 기록 없음</p>
              )}
            </div>

            {/* 4. 운동 카드 */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <Dumbbell className="w-4 h-4" />
                운동 기록 (오늘)
              </div>
              {snapshot?.exercise?.records && snapshot.exercise.records.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {snapshot.exercise.records.map((record, i) => (
                    <div key={i} className="space-y-1">
                      {record.exercises && record.exercises.length > 0 && (
                        <ul className="space-y-1">
                          {record.exercises.map((ex: any, j: number) => (
                            <li key={j} className="flex items-center gap-2">
                              <span className="font-medium">{ex.name || '운동'}</span>
                              {ex.sets && <span className="text-muted-foreground">{ex.sets}세트</span>}
                              {ex.reps && <span className="text-muted-foreground">{ex.reps}회</span>}
                              {ex.weight && <span className="text-muted-foreground">{ex.weight}kg</span>}
                              {ex.duration && <span className="text-muted-foreground">{ex.duration}분</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {record.images && record.images.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {record.images.slice(0, 3).map((img, j) => (
                            <img 
                              key={j} 
                              src={img} 
                              alt="운동 사진" 
                              className="w-12 h-12 rounded object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">운동 기록 없음</p>
              )}
            </div>

            {/* 5. 메모 카드 */}
            {(snapshot?.memo || summary?.memo) && (
              <div className="bg-slate-50 dark:bg-slate-950/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4" />
                  추가 메모
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {snapshot?.memo || summary?.memo}
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
