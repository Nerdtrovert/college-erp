import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface DropdownSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'children'> {
  options?: DropdownOption[];
  onChange?: React.ChangeEventHandler<HTMLSelectElement> | ((value: string) => void);
  placeholder?: string;
  ariaLabel?: string;
  leadingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  ariaLabel,
  leadingIcon,
  children,
  className,
  disabled,
  required,
  name,
  id,
  defaultValue,
  ...selectProps
}) => {
  const selectedValue = String(value ?? defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const optionChildren = React.Children.toArray(children).flatMap((child): DropdownOption[] => {
    if (!React.isValidElement<{ value?: string; disabled?: boolean; children?: React.ReactNode }>(child) || child.type !== 'option') {
      return [];
    }
    return [{
      value: String(child.props.value ?? ''),
      label: child.props.children,
      disabled: child.props.disabled,
    }];
  });
  const menuOptions = options ?? optionChildren;
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, menuOptions.findIndex((option) => option.value === selectedValue)),
  );
  const generatedId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties>();
  const selectedOption = menuOptions.find((option) => option.value === selectedValue);
  const listboxId = `dropdown-${generatedId}`;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node
        && !containerRef.current?.contains(event.target)
        && !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = buttonRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const menuHeight = Math.min(menuOptions.length * 40 + 12, 256);
      const spaceBelow = window.innerHeight - bounds.bottom;
      const top = spaceBelow < menuHeight + 16 && bounds.top > spaceBelow
        ? Math.max(8, bounds.top - menuHeight - 8)
        : bounds.bottom + 8;

      setMenuPosition({
        position: 'fixed',
        top,
        left: bounds.left,
        width: bounds.width,
        zIndex: 1000,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, menuOptions.length]);

  const openMenu = () => {
    setActiveIndex(Math.max(0, menuOptions.findIndex((option) => option.value === selectedValue)));
    setOpen(true);
  };

  const selectOption = (option: DropdownOption) => {
    if (option.disabled || disabled) return;
    const select = selectRef.current;
    if (select) {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, option.value);
    }
    if (options) {
      if (typeof onChange === 'function') (onChange as (value: string) => void)(option.value);
    } else if (select) {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (menuOptions.length === 0 || disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((current) => (
        event.key === 'ArrowDown'
          ? (current + 1) % menuOptions.length
          : (current - 1 + menuOptions.length) % menuOptions.length
      ));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && menuOptions[activeIndex]) selectOption(menuOptions[activeIndex]);
      else openMenu();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(menuOptions.length - 1);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <select
        {...selectProps}
        ref={selectRef}
        id={id ? `${id}-native` : undefined}
        name={name}
        value={selectedValue}
        required={required}
        disabled={disabled}
        onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      >
        {children ?? menuOptions.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        id={id}
        aria-label={ariaLabel ?? selectProps['aria-label']}
        aria-labelledby={selectProps['aria-labelledby']}
        aria-required={required || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-white/75 px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-sm backdrop-blur-md transition duration-200 ease-out hover:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${
          className ?? ''
        } ${
          open ? 'border-blue-400 ring-4 ring-blue-500/10' : 'border-gray-200 hover:border-blue-300'
        }`}
      >
        {leadingIcon && <span className="shrink-0 text-gray-400">{leadingIcon}</span>}
        <span className={`min-w-0 flex-1 truncate ${selectedOption ? 'text-gray-800' : 'text-gray-500'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-gray-400 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel ?? selectProps['aria-label']}
          style={menuPosition}
          className="max-h-64 overflow-y-auto rounded-xl border border-white/70 bg-white/75 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl animate-dropdown-in motion-reduce:animate-none"
        >
          {menuOptions.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isActive = index === activeIndex;
            return (
              <div
                key={option.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                className={`flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 motion-reduce:transition-none ${
                  option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${
                  isActive ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="min-w-0 flex-1">{option.label}</span>
                {isSelected && <Check size={16} className="shrink-0 text-blue-600" />}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
};
