import * as React from "react"
import { cn } from "@/lib/utils"

export interface MarkerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "separator"
}

export function Marker({ className, variant = "default", ...props }: MarkerProps) {
  if (variant === "separator") {
    return (
      <div className={cn("flex items-center gap-4 text-muted-foreground text-sm", className)} {...props}>
        <div className="flex-1 h-px bg-border" />
        {props.children}
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }

  return (
    <div className={cn("flex items-start gap-4", className)} {...props} />
  )
}

export function MarkerIcon({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-0.5 flex items-center justify-center text-muted-foreground", className)} {...props}>
      {React.Children.map(props.children, (child) => {
        if (React.isValidElement(child)) {
          const childElement = child as React.ReactElement<any>;
          return React.cloneElement(childElement, {
            className: cn("size-5", childElement.props.className),
          })
        }
        return child
      })}
    </div>
  )
}

export function MarkerContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-foreground", className)} {...props} />
  )
}
