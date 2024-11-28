'use client';

import { useState, useEffect } from 'react';

interface EditableNumberProps {
  initialValue: number;
  onSave: (value: number) => Promise<void>;
}

export default function EditableNumber({
  initialValue,
  onSave,
}: EditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [tempValue, setTempValue] = useState(String(initialValue));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
    setTempValue(String(initialValue));
  }, [initialValue]);

  const handleSave = async () => {
    try {
      const newValue = parseInt(tempValue, 10);
      if (isNaN(newValue) || newValue < 0) {
        setError('Please enter a valid number');
        return;
      }

      setError(null);
      setValue(newValue);
      setIsEditing(false);
      await onSave(newValue);
    } catch (error) {
      console.error('Error saving value:', error);
      setError('Failed to save value');
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(String(value));
      setError(null);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={tempValue}
            onChange={(e) => {
              setTempValue(e.target.value);
              setError(null);
            }}
            className={`w-20 px-2 py-1 border rounded ${
              error ? 'border-red-500' : ''
            }`}
            min="0"
            autoFocus
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        </div>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setIsEditing(true);
        setTempValue(String(value));
        setError(null);
      }}
      className="hover:text-blue-500"
    >
      {value}
    </button>
  );
}
