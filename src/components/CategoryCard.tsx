import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
}

export function CategoryCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick,
  active = false 
}: CategoryCardProps) {
  return (
    <div 
      className={`bg-[#151B2B] p-6 rounded-lg transition-all cursor-pointer
        ${onClick ? 'hover:bg-[#1C2333] hover:scale-[1.02]' : ''}
        ${active ? 'ring-2 ring-indigo-500 bg-[#1C2333]' : ''}
      `}
      onClick={onClick}
    >
      <Icon className={`h-6 w-6 mb-4 transition-colors ${active ? 'text-indigo-400' : 'text-indigo-500'}`} />
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}