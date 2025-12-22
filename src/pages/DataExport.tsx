import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, Calendar as CalendarIcon, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { jsPDF } from "jspdf";

type ExportType = "meal" | "exercise" | "weight";

export default function DataExport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const downloadCSV = async (type: ExportType) => {
    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return;
    }

    let csvContent = "";
    let filename = "";

    const from = dateRange?.from || subDays(new Date(), 30);
    const to = dateRange?.to || new Date();
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");

    try {
      if (type === "meal") {
        const { data, error } = await supabase
          .from("meal_records")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", fromStr)
          .lte("date", toStr)
          .order("date", { ascending: true });

        if (error) throw error;

        csvContent = "날짜,식사,음식명,칼로리,탄수화물,단백질,지방\n";
        const mealTypes: Record<string, string> = {
          breakfast: "아침",
          lunch: "점심",
          dinner: "저녁",
          snack: "간식",
        };

        (data || []).forEach((r) => {
          const foods = r.foods as any[];
          (foods || []).forEach((f: any) => {
            csvContent += `${r.date},${mealTypes[r.meal_type] || r.meal_type},${f.name || ""},${f.calories || 0},${f.carbs || 0},${f.protein || 0},${f.fat || 0}\n`;
          });
        });
        filename = `식사기록_${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
      } else if (type === "exercise") {
        const { data, error } = await supabase
          .from("gym_records")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", fromStr)
          .lte("date", toStr)
          .order("date", { ascending: true });

        if (error) throw error;

        csvContent = "날짜,운동명,세트,횟수,중량(kg)\n";
        (data || []).forEach((r) => {
          const exercises = r.exercises as any[];
          (exercises || []).forEach((ex: any) => {
            (ex.sets || []).forEach((s: any, i: number) => {
              csvContent += `${r.date},${ex.name},${i + 1},${s.reps || 0},${s.weight || 0}\n`;
            });
          });
        });
        filename = `운동기록_${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
      } else if (type === "weight") {
        const { data: weightData } = await supabase
          .from("weight_records")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", fromStr)
          .lte("date", toStr)
          .order("date", { ascending: true });

        const { data: inbodyData } = await supabase
          .from("inbody_records")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", fromStr)
          .lte("date", toStr)
          .order("date", { ascending: true });

        csvContent = "날짜,체중(kg),골격근량(kg),체지방량(kg),체지방률(%),기초대사량,내장지방\n";

        const allDates = new Set([
          ...(weightData || []).map((r) => r.date),
          ...(inbodyData || []).map((r) => r.date),
        ]);

        Array.from(allDates)
          .sort()
          .forEach((date) => {
            const weight = (weightData || []).find((r) => r.date === date);
            const inbody = (inbodyData || []).find((r) => r.date === date);
            csvContent += `${date},${weight?.weight || inbody?.weight || ""},${inbody?.skeletal_muscle || ""},${inbody?.body_fat || ""},${inbody?.body_fat_percent || ""},${inbody?.bmr || ""},${inbody?.visceral_fat || ""}\n`;
          });

        filename = `체중인바디_${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
      }

      // BOM for Korean encoding
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "다운로드 완료!", description: filename });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "내보내기 실패", variant: "destructive" });
    }
  };

  // 의료진용 1장 PDF 생성
  const generateMedicalPDF = async () => {
    if (!user || !profile) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return;
    }

    setGeneratingPDF(true);

    try {
      const today = new Date();
      const days7 = format(subDays(today, 7), "yyyy-MM-dd");
      const days30 = format(subDays(today, 30), "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");

      // 최근 7일 식사 데이터
      const { data: meals7 } = await supabase
        .from("meal_records")
        .select("total_calories, foods")
        .eq("user_id", user.id)
        .gte("date", days7)
        .lte("date", todayStr);

      // 최근 30일 식사 데이터
      const { data: meals30 } = await supabase
        .from("meal_records")
        .select("total_calories, foods")
        .eq("user_id", user.id)
        .gte("date", days30)
        .lte("date", todayStr);

      // 최근 7일 물 데이터
      const { data: water7 } = await supabase
        .from("water_logs")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", days7)
        .lte("date", todayStr);

      // 최근 7일 운동 데이터
      const { data: exercise7 } = await supabase
        .from("gym_records")
        .select("exercises")
        .eq("user_id", user.id)
        .gte("date", days7)
        .lte("date", todayStr);

      // 계산
      const totalCal7 = (meals7 || []).reduce((sum, m) => sum + (m.total_calories || 0), 0);
      const totalProtein7 = (meals7 || []).reduce((sum, m) => {
        const foods = m.foods as any[];
        return sum + (foods || []).reduce((fs: number, f: any) => fs + (f.protein || 0), 0);
      }, 0);
      const avgCal7 = meals7?.length ? Math.round(totalCal7 / 7) : 0;
      const avgProtein7 = meals7?.length ? Math.round(totalProtein7 / 7) : 0;

      const totalCal30 = (meals30 || []).reduce((sum, m) => sum + (m.total_calories || 0), 0);
      const avgCal30 = meals30?.length ? Math.round(totalCal30 / 30) : 0;

      const totalWater7 = (water7 || []).reduce((sum, w) => sum + w.amount, 0);
      const avgWater7 = water7?.length ? Math.round(totalWater7 / 7) : 0;

      const exerciseCount7 = exercise7?.length || 0;

      // 주요 운동 추출
      const exerciseNames: string[] = [];
      (exercise7 || []).forEach((r) => {
        const exercises = r.exercises as any[];
        (exercises || []).forEach((ex: any) => {
          if (ex.name && !exerciseNames.includes(ex.name)) {
            exerciseNames.push(ex.name);
          }
        });
      });

      // PDF 생성 (한글 폰트 미지원으로 영문 + 숫자 위주)
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // 헤더
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Health Summary Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(today, "yyyy-MM-dd HH:mm")}`, pageWidth / 2, 28, { align: "center" });

      // 사용자 정보
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Information", 20, 45);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${profile.nickname || "User"}`, 20, 55);
      doc.text(`User ID: ${user.id.slice(0, 8)}...`, 20, 62);

      // 7일 요약
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Last 7 Days Summary", 20, 80);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Average Calories: ${avgCal7} kcal/day`, 25, 90);
      doc.text(`Average Protein: ${avgProtein7} g/day`, 25, 97);
      doc.text(`Average Water: ${avgWater7} ml/day`, 25, 104);
      doc.text(`Exercise Sessions: ${exerciseCount7} times`, 25, 111);

      if (exerciseNames.length > 0) {
        doc.text(`Main Exercises: ${exerciseNames.slice(0, 3).join(", ")}`, 25, 118);
      }

      // 30일 요약
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Last 30 Days Summary", 20, 138);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Average Calories: ${avgCal30} kcal/day`, 25, 148);

      // 푸터
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text("This report is generated from Yanggaeng Health App.", pageWidth / 2, 280, { align: "center" });
      doc.text("For medical professional use only.", pageWidth / 2, 286, { align: "center" });

      // 다운로드
      doc.save(`health_summary_${format(today, "yyyyMMdd")}.pdf`);
      toast({ title: "PDF 다운로드 완료!" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "PDF 생성 실패", variant: "destructive" });
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">데이터 내보내기</h1>
        </div>
        <p className="text-white/90">CSV 또는 PDF로 기록을 다운로드하세요</p>
      </div>

      <div className="p-4 space-y-6">
        {/* 의료진용 PDF */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl border border-blue-200 dark:border-blue-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">의료진용 요약 PDF</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">최근 7/30일 건강 요약</p>
            </div>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
            프로필, 평균 칼로리/단백질/물 섭취량, 운동 횟수를 1장으로 정리합니다.
          </p>
          <Button 
            className="w-full" 
            onClick={generateMedicalPDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                PDF 다운로드
              </>
            )}
          </Button>
        </div>

        {/* 날짜 범위 선택 */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            CSV 날짜 범위
          </h2>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowCalendar(true)}
          >
            {dateRange?.from && dateRange?.to
              ? `${format(dateRange.from, "yyyy.MM.dd")} - ${format(dateRange.to, "yyyy.MM.dd")}`
              : "날짜 범위 선택"}
          </Button>
        </div>

        <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>날짜 범위 선택</DialogTitle>
            </DialogHeader>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              className="rounded-md"
            />
            <Button onClick={() => setShowCalendar(false)}>확인</Button>
          </DialogContent>
        </Dialog>

        {/* CSV 내보내기 옵션 */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CSV 내보내기
          </h2>

          <button
            onClick={() => downloadCSV("meal")}
            className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:bg-muted transition-colors"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">식사 기록</p>
              <p className="text-sm text-muted-foreground">
                음식명, 칼로리, 영양소 정보
              </p>
            </div>
            <Download className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => downloadCSV("exercise")}
            className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:bg-muted transition-colors"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💪</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">운동 기록</p>
              <p className="text-sm text-muted-foreground">
                운동명, 세트, 횟수, 중량
              </p>
            </div>
            <Download className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => downloadCSV("weight")}
            className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:bg-muted transition-colors"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚖️</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">체중 / 인바디</p>
              <p className="text-sm text-muted-foreground">
                체중, 골격근량, 체지방률 등
              </p>
            </div>
            <Download className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
