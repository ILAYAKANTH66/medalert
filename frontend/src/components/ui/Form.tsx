import React from 'react';

export const Label = ({
  className = '',
  required = false,
  htmlFor,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) => (
  <label
    htmlFor={htmlFor}
    className={`text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none ${className}`}
    {...props}
  >
    {children}
    {required && <span className="text-rose-500 ml-1">*</span>}
  </label>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', type = 'text', id, name, ...props }, ref) => {
    const fieldName = name ?? id;
    return (
      <input
        ref={ref}
        id={id}
        name={fieldName}
        type={type}
        className={`w-full rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30 px-3.5 py-2.5 text-sm outline-none transition-all duration-300 placeholder:text-zinc-400 focus:border-indigo-500/85 focus:bg-white dark:focus:bg-zinc-900/60 focus:ring-4 focus:ring-indigo-500/10 text-zinc-900 dark:text-zinc-50 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, id, name, ...props }, ref) => {
    const fieldName = name ?? id;
    return (
      <select
        ref={ref}
        id={id}
        name={fieldName}
        className={`w-full rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30 px-3.5 py-2.5 text-sm outline-none transition-all duration-300 focus:border-indigo-500/85 focus:bg-white dark:focus:bg-zinc-900/60 focus:ring-4 focus:ring-indigo-500/10 text-zinc-900 dark:text-zinc-50 appearance-none ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export const FormGroup = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col gap-1.5 w-full ${className}`} {...props}>
    {children}
  </div>
);

export const FormError = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  if (!children) return null;
  return (
    <span className={`text-xs font-medium text-rose-500 dark:text-rose-400 animate-in slide-in-from-top-1 duration-200 ${className}`} {...props}>
      {children}
    </span>
  );
};
