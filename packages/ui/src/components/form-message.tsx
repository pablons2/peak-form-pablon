import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { Alert, AlertDescription } from "./alert";

const formMessageVariants = cva("", {
  variants: {
    variant: {
      destructive: "",
      warning: "",
      success: "",
      default: "",
    },
  },
  defaultVariants: {
    variant: "destructive",
  },
});

export interface FormMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formMessageVariants> {
  message?: string;
}

export const FormMessage = React.forwardRef<HTMLDivElement, FormMessageProps>(
  ({ className, variant, message, ...props }, ref) => {
    if (!message) return null;

    return (
      <Alert
        ref={ref}
        variant={variant}
        className={cn(formMessageVariants({ variant }), className)}
        {...props}
      >
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  },
);
FormMessage.displayName = "FormMessage";
