/**
 * Quick Add Panel
 * - 최근 기록, 즐겨찾기에서 원탭 추가
 * - 모바일 한 화면에 맞도록 최적화
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Star, Plus, Trash2, Heart, HeartOff, Loader2 } from 'lucide-react';
import { MealFood, MealType } from '@/hooks/useServerSync';
import { useRecentFoods } from '@/hooks/useRecentFoods';
import { useFavoriteFoods } from '@/hooks/useFavoriteFoods';
import { useToast } from '@/hooks/use-toast';

interface QuickAddPanelProps {
  mealType: MealType;
  onAddFood: (food: MealFood) => void;
  onAddFoods: (foods: MealFood[]) => void;
}

export function QuickAddPanel({ mealType, onAddFood, onAddFoods }: QuickAddPanelProps) {
  const { toast } = useToast();
  const { foods: recentFoods, loading: recentLoading } = useRecentFoods();
  const { foods: favoriteFoods, loading: favLoading, add: addFavorite, remove: removeFavorite, isFavorite, getFavoriteId } = useFavoriteFoods();
  
  const [adding, setAdding] = useState<string | null>(null);

  const handleAddFood = async (food: MealFood, id: string) => {
    setAdding(id);
    onAddFood(food);
    setAdding(null);
  };

  const handleToggleFavorite = async (food: MealFood) => {
    if (isFavorite(food.name)) {
      const id = getFavoriteId(food.name);
      if (id) {
        await removeFavorite(id);
        toast({ title: '즐겨찾기에서 제거됨' });
      }
    } else {
      await addFavorite(food);
      toast({ title: '즐겨찾기에 추가됨' });
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <Tabs defaultValue="favorite" className="w-full flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
          <TabsTrigger value="favorite" className="text-xs gap-1">
            <Star className="w-3 h-3" />
            즐겨찾기
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs gap-1">
            <Clock className="w-3 h-3" />
            최근
          </TabsTrigger>
        </TabsList>

        {/* 즐겨찾기 */}
        <TabsContent value="favorite" className="mt-2 flex-1 overflow-hidden">
          <ScrollArea className="h-[45vh] max-h-[350px]">
            {favLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : favoriteFoods.length === 0 ? (
              <div className="text-center py-6">
                <Star className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">즐겨찾기가 없어요</p>
                <p className="text-xs text-muted-foreground mt-1">
                  최근 기록에서 ♥ 눌러 추가
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pr-2">
                {favoriteFoods.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between p-2.5 bg-card border border-border rounded-xl"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.calories}kcal
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeFavorite(food.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleAddFood(food, food.id)}
                        disabled={adding === food.id}
                      >
                        {adding === food.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* 최근 기록 */}
        <TabsContent value="recent" className="mt-2 flex-1 overflow-hidden">
          <ScrollArea className="h-[45vh] max-h-[350px]">
            {recentLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentFoods.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                최근 기록이 없어요
              </p>
            ) : (
              <div className="space-y-1.5 pr-2">
                {recentFoods.map((food, idx) => (
                  <div
                    key={`${food.name}-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-card border border-border rounded-xl"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.calories}kcal
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleFavorite(food)}
                      >
                        {isFavorite(food.name) ? (
                          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                        ) : (
                          <HeartOff className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleAddFood(food, `recent-${idx}`)}
                        disabled={adding === `recent-${idx}`}
                      >
                        {adding === `recent-${idx}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
