"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  message: string;
  name?: string;
  value?: string;
};

export function ConfirmSubmitButton({ children, className, message, name, value }: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      name={name}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      type="submit"
      value={value}
    >
      {children}
    </button>
  );
}
