import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendColor?: string;
  className?: string;
  valueColor?: string;
  onClick?: () => void;
  clickable?: boolean;
  subtitle?: string;
  subtitleColor?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendColor = "text-green-500",
  className = "",
  valueColor = "text-white",
  onClick,
  clickable = false,
  subtitle,
  subtitleColor = "text-gray-400"
}: StatsCardProps) {
  return (
    <div 
      className={`
        p-6 rounded-lg transition-all duration-200
        ${className}
        ${clickable ? 'cursor-pointer hover:scale-[1.02] hover:bg-[#1C2333] hover:shadow-lg' : ''}
      `}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm">{title}</h3>
        <Icon className="h-6 w-6 text-indigo-500" />
      </div>
      <div>
        <p className={`text-4xl font-bold ${valueColor} mb-2`}>{value}</p>
        {subtitle && (
          <p className={`text-sm ${subtitleColor} flex items-center gap-1`}>
            {subtitle}
            {clickable && (
              <span className="text-xs text-indigo-400">(clique para detalhes)</span>
            )}
          </p>
        )}
        {trend && (
          <p className={`text-sm ${trendColor}`}>{trend}</p>
        )}
      </div>
    </div>
  );
}