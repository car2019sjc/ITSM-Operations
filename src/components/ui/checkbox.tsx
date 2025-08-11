import React from "react";
import { Check } from "lucide-react";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({ 
  checked = false, 
  onCheckedChange, 
  className = "", 
  id,
  ...props 
}: CheckboxProps) {
  return (
    <div className="relative">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only"
        {...props}
      />
      <label
        htmlFor={id}
        className={`
          inline-flex items-center justify-center w-4 h-4 rounded border-2 cursor-pointer transition-colors
          ${checked 
            ? 'bg-blue-600 border-blue-600 text-white' 
            : 'border-gray-600 bg-transparent hover:border-gray-500'
          }
          ${className}
        `}
      >
        {checked && <Check className="w-3 h-3" />}
      </label>
    </div>
  );
}

