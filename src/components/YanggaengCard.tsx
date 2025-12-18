import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface YanggaengCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: "health" | "nutrition" | "exercise";
  features: string[];
  delay?: number;
}

const colorStyles = {
  health: {
    bg: "bg-gradient-to-br from-emerald-50 to-teal-100",
    icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    border: "border-emerald-200 hover:border-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
  },
  nutrition: {
    bg: "bg-gradient-to-br from-orange-50 to-amber-100",
    icon: "bg-gradient-to-br from-orange-500 to-amber-600 text-white",
    border: "border-orange-200 hover:border-orange-400",
    badge: "bg-orange-100 text-orange-700",
  },
  exercise: {
    bg: "bg-gradient-to-br from-sky-50 to-blue-100",
    icon: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
    border: "border-sky-200 hover:border-sky-400",
    badge: "bg-sky-100 text-sky-700",
  },
};

export function YanggaengCard({
  title,
  description,
  icon: Icon,
  color,
  features,
  delay = 0,
}: YanggaengCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      className={cn(
        "group relative rounded-3xl p-8 border-2 transition-all duration-500",
        "hover:shadow-xl hover:-translate-y-2 cursor-pointer",
        styles.bg,
        styles.border,
        "animate-slide-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 아이콘 */}
      <div
        className={cn(
          "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
          "shadow-lg transition-transform duration-300 group-hover:scale-110",
          styles.icon
        )}
      >
        <Icon className="w-10 h-10" />
      </div>

      {/* 제목 */}
      <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>

      {/* 설명 */}
      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
        {description}
      </p>

      {/* 기능 목록 */}
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                color === "health" && "bg-emerald-500",
                color === "nutrition" && "bg-orange-500",
                color === "exercise" && "bg-sky-500"
              )}
            />
            <span className="text-base text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* 배지 */}
      <div
        className={cn(
          "absolute top-6 right-6 px-4 py-1.5 rounded-full text-sm font-medium",
          styles.badge
        )}
      >
        양갱
      </div>
    </div>
  );
}
