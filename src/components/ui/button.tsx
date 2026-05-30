"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-brand to-brand-2 text-white shadow-[0_4px_20px_-6px_rgba(91,140,255,0.6)] hover:brightness-110 active:brightness-95",
        secondary:
          "bg-surface-2 text-ink border border-border hover:bg-[#1a2030] hover:border-[#2a3349]",
        ghost: "text-muted hover:text-ink hover:bg-surface-2",
        outline: "border border-border text-ink hover:bg-surface-2",
        danger: "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
        good: "bg-good/15 text-good border border-good/30 hover:bg-good/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
