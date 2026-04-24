import React, { useState, type ChangeEvent } from "react";

export interface TimeSelectorProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value?: string;
  onChange?: (val: string) => void;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({ label, value = "", onChange, ...props }) => {
  const [inputValue, setInputValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (value && typeof value === 'string') {
      setInputValue(value);
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    
    if (raw.length < inputValue.length) {
      setInputValue(raw);
      onChange?.(raw);
      return;
    }

    const nums = raw.replace(/[^0-9]/g, '');
    const chars = raw.replace(/[^APM]/g, '');

    let h = '';
    let m = '';
    let formatted = '';

    if (nums.length > 0) {
      if (parseInt(nums[0], 10) >= 2) {
        h = '0' + nums[0];
        m = nums.slice(1, 3);
      } else {
        h = nums.slice(0, 2);
        if (h.length === 2 && parseInt(h, 10) > 12) {
          h = '01';
          m = nums.slice(1, 3);
        } else {
          m = nums.slice(2, 4);
        }
      }
    }

    if (m.length === 2 && parseInt(m, 10) > 59) {
      m = '59';
    }

    if (nums.length > 0) {
      if (raw.includes(':') && h.length === 1) {
        h = '0' + h;
      }
      formatted = h;

      if (m.length > 0 || (h.length === 2 && raw.includes(':'))) {
        formatted += ':';
      }
      formatted += m;
    }

    if (chars.length > 0) {
      const period = chars.includes('P') ? 'PM' : 'AM';
      formatted += ' ' + period;
    } else if (raw.endsWith(' ') && formatted.length >= 5) {
      formatted += ' ';
    } else if ((raw.endsWith('A') || raw.endsWith('P')) && formatted.length >= 5) {
      const period = raw.endsWith('P') ? 'PM' : 'AM';
      formatted += ' ' + period;
    }

    setInputValue(formatted);
    onChange?.(formatted);
  };

  const handleBlur = () => {
    if (!inputValue) return;

    const nums = inputValue.replace(/[^0-9]/g, '');
    const pMatch = inputValue.match(/[AP]M?/i);
    const p = pMatch ? (pMatch[0].toUpperCase().startsWith('P') ? 'PM' : 'AM') : 'AM';

    let h = 12;
    let m = 0;

    if (nums.length > 0) {
      if (nums.length <= 2) {
        h = parseInt(nums, 10);
      } else {
        h = parseInt(nums.slice(0, 2), 10);
        m = parseInt(nums.slice(2, 4).padEnd(2, '0'), 10);
      }
    }
    
    if (h === 0 || h > 12) h = 12;
    if (m > 59) m = 59;

    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
    setInputValue(formatted);
    onChange?.(formatted);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-brick-200">{label}</label>
      <input
        type="text"
        placeholder="HH:MM AM"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className="px-3 py-2 bg-brick-100 text-brick-900 border border-brick-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brick-500 font-mono tracking-widest"
        {...props}
      />
    </div>
  );
};
