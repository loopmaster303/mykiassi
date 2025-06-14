'use client';

import React from 'react';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  className = '',
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className={`h-4 w-4 rounded border border-gray-300 text-primary focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}
