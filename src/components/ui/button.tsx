import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-lg font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:scale-[1.02]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // 양갱 스타일 버튼
        yanggaeng: "bg-primary text-primary-foreground hover:shadow-glow hover:scale-[1.02] shadow-soft",
        hero: "bg-primary text-primary-foreground text-xl px-10 py-6 hover:shadow-glow hover:scale-[1.03] shadow-lg",
        card: "bg-card text-card-foreground border-2 border-border hover:border-primary hover:shadow-card",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-lg",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-xl px-4 text-base",
        lg: "h-14 rounded-2xl px-8 text-xl",
        xl: "h-16 rounded-2xl px-10 text-xl",
        icon: "h-12 w-12",
        // 시니어 친화적 큰 버튼
        touch: "h-14 min-w-[200px] px-8 text-xl",
        "touch-lg": "h-16 min-w-[240px] px-10 text-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
