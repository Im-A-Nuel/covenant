import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-muted border-border",
        brand: "bg-brand/10 text-brand border-brand/25",
        good: "bg-good/10 text-good border-good/25",
        warn: "bg-warn/10 text-warn border-warn/25",
        bad: "bg-bad/10 text-bad border-bad/25",
        violet: "bg-brand-2/10 text-brand-2 border-brand-2/25",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
