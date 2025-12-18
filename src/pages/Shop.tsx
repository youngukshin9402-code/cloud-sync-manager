import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ShoppingBag,
  Search,
  Heart,
  Star,
  ExternalLink,
  Coins,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  health_tags: string[] | null;
  image_url: string | null;
  purchase_link: string | null;
}

export default function Shop() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userHealthTags, setUserHealthTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 상품 목록
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setProducts(productsData || []);

      // 사용자 건강 태그
      if (profile?.id) {
        const { data: healthRecord } = await supabase
          .from("health_records")
          .select("health_tags")
          .eq("user_id", profile.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (healthRecord?.health_tags) {
          setUserHealthTags(healthRecord.health_tags);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [profile]);

  // 맞춤 추천 상품 (건강 태그 매칭)
  const recommendedProducts = products.filter(
    (p) =>
      p.health_tags &&
      p.health_tags.some((tag) => userHealthTags.includes(tag))
  );

  // 검색 필터
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePurchase = (product: Product) => {
    if (product.purchase_link) {
      window.open(product.purchase_link, "_blank");
    } else {
      toast({
        title: "구매 링크 없음",
        description: "이 상품은 현재 구매할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const formatTagName = (tag: string) => {
    const tagMap: Record<string, string> = {
      high_bp: "고혈압",
      diabetes: "당뇨",
      liver_issue: "간 건강",
      kidney_issue: "신장 건강",
      high_cholesterol: "콜레스테롤",
      borderline_bp: "혈압 주의",
      borderline_sugar: "혈당 주의",
    };
    return tagMap[tag] || tag;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">건강 상점</h1>
        </div>
        <p className="text-white/90">건강한 생활을 위한 맞춤 상품</p>

        {/* 포인트 표시 */}
        <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            <span>사용 가능 포인트</span>
          </div>
          <span className="font-bold text-lg">
            {profile?.current_points?.toLocaleString() || 0}P
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="상품 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 맞춤 추천 */}
      {!searchQuery && recommendedProducts.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            회원님을 위한 추천
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recommendedProducts.map((product) => (
              <Card
                key={product.id}
                className="min-w-[200px] border-amber-200 bg-amber-50/50"
              >
                <CardContent className="p-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-amber-100 flex items-center justify-center rounded-t-lg">
                      <Heart className="h-8 w-8 text-amber-400" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-semibold line-clamp-1">{product.name}</p>
                    <p className="text-primary font-bold">
                      ₩{product.price.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handlePurchase(product)}
                    >
                      구매하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 전체 상품 */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          전체 상품
        </h2>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "검색 결과가 없습니다" : "등록된 상품이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 bg-muted flex items-center justify-center">
                      <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-semibold line-clamp-1">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    )}
                    {product.health_tags && product.health_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.health_tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {formatTagName(tag)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-primary font-bold">
                        ₩{product.price.toLocaleString()}
                      </span>
                      <Button size="sm" onClick={() => handlePurchase(product)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
