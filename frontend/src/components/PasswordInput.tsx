"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  inputClassName?: string;
}

/**
 * Reusable password input with accessible Show/Hide visibility toggle.
 */
export function PasswordInput({
  leftIcon,
  inputClassName = "",
  className = "",
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {leftIcon}
        </span>
      )}
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={`w-full rounded-xl border border-slate-200 bg-white/75 py-2.5 ${
          leftIcon ? "pl-9" : "px-3.5"
        } pr-10 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${inputClassName}`}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:hover:bg-white/10 dark:hover:text-cyan-300"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

