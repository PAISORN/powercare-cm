"use client";

import { useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

export function ProfilePasswordForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmNewPassword") ?? "");

    if (newPassword.length < 10) {
      event.preventDefault();
      setError("New password must be at least 10 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      event.preventDefault();
      setError("Passwords do not match");
      return;
    }

    setError("");
  }

  return (
    <form action={action} className="grid gap-4" onSubmit={onSubmit}>
      <InputField label="Current password" name="currentPassword" type="password" />
      <InputField label="New password" name="newPassword" type="password" />
      <InputField label="Confirm new password" name="confirmNewPassword" type="password" />

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function InputField({
  label,
  name,
  type,
}: {
  label: string;
  name: string;
  type: "password";
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span className="text-[var(--muted)]">{label}</span>
      <input
        aria-label={label}
        className="min-h-[52px] rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 outline-none"
        name={name}
        type={type}
      />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Updating..." : "Change password"}
    </button>
  );
}
