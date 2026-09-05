import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  description?: string
  action?: React.ReactNode
}

function Empty({
  className,
  icon: Icon,
  title,
  description,
  action,
  children,
  ...props
}: EmptyProps) {
  if (title || Icon || description || action) {
    return (
      <div
        className={cn(
          "flex min-h-[180px] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in-50",
          className
        )}
        {...props}
      >
        {Icon && (
          <EmptyMedia variant="icon">
            <Icon className="size-5 stroke-[1.75]" />
          </EmptyMedia>
        )}
        <EmptyHeader>
          {title && <EmptyTitle>{title}</EmptyTitle>}
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {action && <EmptyContent>{action}</EmptyContent>}
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-[180px] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function EmptyHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col items-center gap-1.5", className)} {...props} />
}

function EmptyMedia({
  className,
  variant = "icon",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "icon" | "default" }) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center justify-center shrink-0",
        variant === "icon" && "size-10 rounded-full bg-muted/60 text-muted-foreground ring-4 ring-muted/20",
        className
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-xs font-semibold text-foreground tracking-tight", className)} {...props} />
}

function EmptyDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[11px] text-muted-foreground max-w-xs leading-normal", className)} {...props} />
}

function EmptyContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3 flex items-center gap-2", className)} {...props} />
}

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
}
