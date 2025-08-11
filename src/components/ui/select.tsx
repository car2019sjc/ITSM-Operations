import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {}
});

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className = "" }: SelectTriggerProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-600 
        bg-[#0F172A] px-3 py-2 text-sm text-white placeholder:text-gray-400 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

export function SelectValue({ placeholder, className = "" }: SelectValueProps) {
  const { value } = React.useContext(SelectContext);
  
  return (
    <span className={`block truncate ${!value ? 'text-gray-400' : ''} ${className}`}>
      {value || placeholder}
    </span>
  );
}

export function SelectContent({ children, className = "" }: SelectContentProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={contentRef}
      className={`
        absolute top-full left-0 z-50 w-full mt-1 rounded-md border border-gray-600 
        bg-[#1C2333] shadow-lg max-h-60 overflow-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className = "" }: SelectItemProps) {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext);
  
  return (
    <div
      onClick={() => {
        onValueChange?.(value);
        setIsOpen(false);
      }}
      className={`
        cursor-pointer px-3 py-2 text-sm text-white hover:bg-[#2A3441] 
        transition-colors first:rounded-t-md last:rounded-b-md
        ${className}
      `}
    >
      {children}
    </div>
  );
}

