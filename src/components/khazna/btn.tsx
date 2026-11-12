import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const btnVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110",
        glass: "glass rounded-xl text-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-accent",
        outline: "border border-glass-border text-foreground hover:bg-accent",
        danger: "bg-debit/15 text-debit border border-debit/30 hover:bg-debit/25",
        credit: "bg-credit/15 text-credit border border-credit/30 hover:bg-credit/25",
        soft: "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "glass", size: "md" },
  },
);

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof btnVariants> {
  asChild?: boolean;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(btnVariants({ variant, size }), className)} {...props} />;
});
Btn.displayName = "Btn";
