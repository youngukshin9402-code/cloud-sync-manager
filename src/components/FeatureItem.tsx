import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  delay?: number;
}

export function FeatureItem({
  icon: Icon,
  title,
  description,
  delay = 0,
}: FeatureItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-5 p-6 rounded-2xl",
        "bg-card/50 backdrop-blur-sm border border-border/50",
        "transition-all duration-300 hover:bg-card hover:shadow-soft",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h4 className="text-xl font-semibold text-foreground mb-2">{title}</h4>
        <p className="text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
