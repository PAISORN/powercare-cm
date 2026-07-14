"use client";

import type { ChangeEvent, SelectHTMLAttributes } from "react";

export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    props.onChange?.(event);
    event.currentTarget.form?.requestSubmit();
  }

  return <select {...props} onChange={handleChange} />;
}
