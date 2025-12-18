import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Pencil, Trash2, Package } from "lucide-react";

export default function AdminProducts() {
  const navigate = useNavigate();
  const { products, loading, saveProduct, deleteProduct } = useAdminData();
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    health_tags: "",
    image_url: "",
    purchase_link: "",
    is_active: true,
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      health_tags: "",
      image_url: "",
      purchase_link: "",
      is_active: true,
    });
    setShowDialog(true);
  };

  const openEditDialog = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      health_tags: product.health_tags?.join(", ") || "",
      image_url: product.image_url || "",
      purchase_link: product.purchase_link || "",
      is_active: product.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const productData = {
      ...(editingProduct?.id ? { id: editingProduct.id } : {}),
      name: formData.name,
      description: formData.description || null,
      price: formData.price,
      health_tags: formData.health_tags
        ? formData.health_tags.split(",").map((t) => t.trim())
        : null,
      image_url: formData.image_url || null,
      purchase_link: formData.purchase_link || null,
      is_active: formData.is_active,
    };

    const success = await saveProduct(productData);
    if (success) {
      setShowDialog(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm("정말로 이 상품을 삭제하시겠습니까?")) {
      await deleteProduct(productId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-16 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">상품 관리</h1>
          <Button className="ml-auto" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            상품 추가
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">등록된 상품이 없습니다</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              첫 상품 추가하기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className={`bg-card rounded-2xl border overflow-hidden ${
                  product.is_active ? "border-border" : "border-muted opacity-60"
                }`}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-lg font-bold text-primary">
                        ₩{product.price.toLocaleString()}
                      </p>
                    </div>
                    {!product.is_active && (
                      <Badge variant="secondary">비활성</Badge>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  {product.health_tags && product.health_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {product.health_tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "상품 수정" : "새 상품 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">상품명 *</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="상품명을 입력하세요"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">가격 *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: parseInt(e.target.value) || 0,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">설명</label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="상품 설명"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">건강 태그 (쉼표로 구분)</label>
              <Input
                value={formData.health_tags}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, health_tags: e.target.value }))
                }
                placeholder="high_bp, diabetes, liver_issue"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">이미지 URL</label>
              <Input
                value={formData.image_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, image_url: e.target.value }))
                }
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">구매 링크</label>
              <Input
                value={formData.purchase_link}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, purchase_link: e.target.value }))
                }
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
