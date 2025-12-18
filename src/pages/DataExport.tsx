import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Calendar as CalendarIcon, FileSpreadsheet } from "lucide-react";
import {
  getMealRecords,
  getGymRecords,
  getWeightRecords,
  getInBodyRecords,
} from "@/lib/localStorage";
import { DateRange } from "react-day-picker";

type ExportType = "meal" | "exercise" | "weight";

export default function DataExport() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [showCalendar, setShowCalendar] = useState(false);

  const downloadCSV = (type: ExportType) => {
    let csvContent = "";
    let filename = "";

    const from = dateRange?.from || subDays(new Date(), 30);
    const to = dateRange?.to || new Date();

    const isInRange = (dateStr: string) => {
      try {
        const date = parseISO(dateStr);
        return isWithinInterval(date, { start: from, end: to });
      } catch {
        return false;
      }
    };

    if (type === "meal") {
      const records = getMealRecords().filter((r) => isInRange(r.date));
      csvContent = "날짜,식사,음식명,양,칼로리,탄수화물,단백질,지방\n";
      records.forEach((r) => {
        const mealTypes: Record<string, string> = {
          breakfast: "아침",
          lunch: "점심",
          dinner: "저녁",
          snack: "간식",
        };
        r.foods.forEach((f) => {
          csvContent += `${r.date},${mealTypes[r.mealType]},${f.name},${f.portion},${f.calories},${f.carbs},${f.protein},${f.fat}\n`;
        });
      });
      filename = `식사기록_${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
    } else if (type === "exercise") {
      const records = getGymRecords().filter((r) => isInRange(r.date));
      csvContent = "날짜,운동명,세트,횟수,중량(kg)\n";
      records.forEach((r) => {
        r.exercises.forEach((ex) => {
          ex.sets.forEach((s, i) => {
            csvContent += `${r.date},${ex.name},${i + 1},${s.reps},${s.weight}\n`;
          });
        });
      });
      filename = `운동기록_${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
    } else if (type === "weight") {
      const weightRecords = getWeightRecords().filter((r) => isInRange(r.date));
      const inbodyRecords = getInBodyRecords().filter((r) => isInRange(r.date));

      csvContent = "날짜,체중(kg),골격근량(kg),체지방량(kg),체지방률(%),기초대사량,내장지방\n";

      const allDates = new Set([
        ...weightRecords.map((r) => r.date),
        ...inbodyRecords.map((r) => r.date),
      ]);

      Array.from(allDates)
        .sort()
        .forEach((date) => {
          const weight = weightRecords.find((r) => r.date === date);
          const inbody = inbodyRecords.find((r) => r.date === date);

          csvContent += `${date},${weight?.weight || inbody?.weight || ""},${inbody?.skeletalMuscle || ""},${inbody?.bodyFat || ""},${inbody?.bodyFatPercent || ""},${inbody?.bmr || ""},${inbody?.visceralFat || ""}\n`;
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
        <p className="text-white/90">CSV 파일로 기록을 다운로드하세요</p>
      </div>

      <div className="p-4 space-y-6">
        {/* 날짜 범위 선택 */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            날짜 범위
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

        {/* 내보내기 옵션 */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            내보내기
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
