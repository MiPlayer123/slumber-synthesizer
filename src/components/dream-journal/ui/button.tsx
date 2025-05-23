import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:translate-y-0.5 active:scale-[0.98] transition-all",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 active:translate-y-0.5 active:scale-[0.98] transition-all",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:translate-y-0.5 active:scale-[0.98] transition-all",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 active:translate-y-0.5 active:scale-[0.98] transition-all",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:translate-y-0.5 active:scale-[0.98] transition-all",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80 active:translate-y-0.5 transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, onTouchStart, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // Add touchStart event handling for mobile devices
    const handleTouchStart = React.useCallback(
      (e: React.TouchEvent<HTMLButtonElement>) => {
        // Prevent double-tap zoom on mobile
        e.preventDefault();

        // Call the original onTouchStart if provided
        onTouchStart?.(e);
      },
      [onTouchStart],
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onTouchStart={handleTouchStart}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
