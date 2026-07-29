import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  isLoading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-8 px-4 text-center w-full",
        className
      )}>
        <div className="relative mb-4">
          <div className="w-16 h-16 bg-border-default/40 rounded-[32px] lg:rounded-[1.5rem] animate-pulse" />
        </div>
        <div className="h-6 w-36 bg-border-default/40 rounded-md mb-2.5 animate-pulse" />
        <div className="h-3.5 w-60 bg-border-default/30 rounded-md mb-1.5 animate-pulse" />
        <div className="h-3.5 w-48 bg-border-default/30 rounded-md mb-5 animate-pulse" />
        {action && (
          <div className="h-10 w-32 bg-border-default/40 rounded-xl lg:rounded-[32px] animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-4 px-4 text-center animate-in fade-in zoom-in duration-500",
      className
    )}>
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-brand-primary/10 blur-2xl rounded-full scale-150 opacity-50" />
        <div className="relative w-16 h-16 bg-gradient-to-br from-bg-card to-bg-main border border-border-default rounded-[32px] lg:rounded-[1.5rem] flex items-center justify-center shadow-brand-primary/5 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {Icon ? (
            <Icon className="w-8 h-8 text-brand-primary/30 group-hover:text-brand-primary group-hover:scale-110 transition-all duration-500" />
          ) : (
            <div className="w-8 h-8 bg-brand-primary/20 rounded-full animate-pulse" />
          )}
        </div>
      </div>
      
      <h3 className="text-lg lg:text-xl font-black text-text-primary mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-[10px] lg:text-xs text-text-muted max-w-xs leading-relaxed mb-4">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center h-10 bg-brand-primary text-text-inverse lg: font-black text-[10px] lg: shadow-xl shadow-brand-primary/20 hover:bg-brand-hover hover:shadow-brand-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all uppercase tracking-wider rounded-full px-7 py-[14px] text-[14px] font-bold"
        >
          {action.icon && <action.icon className="w-3.5 h-3.5 mr-2" />}
          {action.label}
        </button>
      )}
    </div>
  );
};
