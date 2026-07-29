import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

export interface SummaryCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: "blue" | "green" | "orange" | "red";
  trend?: string;
  isPositive?: boolean;
  sparklineData?: number[];
  action?: React.ReactNode;
  iconRightContent?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  onClick?: () => void;
  isActive?: boolean;
}

export function SummaryCard({ title, value, icon, color, trend, isPositive, sparklineData, action, iconRightContent, className, isLoading, onClick, isActive }: SummaryCardProps) {
  const colorClasses = {
    blue: "bg-brand-light text-brand-primary border-brand-primary/10",
    green: "bg-status-success/10 text-status-success border-status-success/10",
    orange: "bg-status-warning/10 text-status-warning border-status-warning/10",
    red: "bg-status-danger/10 text-status-danger border-status-danger/10"
  };

  const sparklineColor = {
    blue: "var(--brand-primary)",
    green: "var(--status-success)",
    orange: "var(--status-warning)",
    red: "var(--status-danger)"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
      "p-3 lg:p-6 rounded-[1.5rem] lg:rounded-3xl border shadow-sm hover:shadow-xl hover:-translate-y-1",
      "transition-[background-color,transform,opacity,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-[transform,box-shadow]",
      "group overflow-hidden relative bg-bg-card border-border-default h-full flex flex-col justify-between min-h-[85px] lg:min-h-[160px]",
      onClick && "cursor-pointer",
      isActive && color === 'blue' && "border-brand-primary ring-2 ring-brand-primary/20 ring-inset",
      isActive && color === 'green' && "border-status-success ring-2 ring-status-success/20 ring-inset",
      isActive && color === 'orange' && "border-status-warning ring-2 ring-status-warning/20 ring-inset",
      isActive && color === 'red' && "border-status-danger ring-2 ring-status-danger/20 ring-inset",
      className
    )}>
      {!isLoading && (
        <div 
          data-shimmer-ignore
          className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-opacity hidden lg:block"
        >
          {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: "w-32 h-32" })}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-1 lg:mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-7 h-7 lg:w-12 lg:h-12 rounded-lg lg:rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110",
            "transition-[background-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform flex-shrink-0",
            colorClasses[color]
          )}>
            {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: "w-3.5 h-3.5 lg:w-6 lg:h-6" })}
          </div>
          {iconRightContent && (
            <div className="flex flex-col text-left">
              {iconRightContent}
            </div>
          )}
        </div>
        {trend && isPositive !== undefined && (
          <div className={cn(
            "flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-black",
            isPositive ? "bg-status-success/20 text-status-success" : "bg-status-danger/20 text-status-danger"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{trend}</span>
          </div>
        )}
      </div>
      
      <div className="relative z-10 mt-auto">
        <div className="flex items-center justify-between">
          <p className="text-[10px] lg:text-xs font-black text-text-muted uppercase tracking-widest leading-tight h-auto min-h-[1.5rem] flex items-center w-full max-w-full truncate">
            <span className="block w-fit max-w-full truncate">{title}</span>
          </p>
          {!isLoading && action && <div className="ml-2">{action}</div>}
        </div>
        <div className="flex items-end justify-between mt-1">
          <div className="text-base lg:text-2xl font-black text-text-primary w-full max-w-full">
            {typeof value === 'string' || typeof value === 'number' ? (
              <p className="block w-fit max-w-full truncate">{value}</p>
            ) : (
              value
            )}
          </div>
          
          {!isLoading && sparklineData && sparklineData.length > 0 && (
            <div className="w-16 h-8 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData.map((v, i) => ({ v, i }))}>
                  <Line 
                    type="monotone" 
                    dataKey="v" 
                    stroke={sparklineColor[color]} 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
