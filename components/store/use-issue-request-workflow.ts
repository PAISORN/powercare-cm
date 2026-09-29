"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { IssueType } from "./issue-request-context-section";
import { validateIssueLines } from "./issue-request-validation";
import type { IssueLine, StockOption } from "./issue-stock-selector";

export function useIssueRequestWorkflow({
  directOnly,
  lines,
  onResetLines,
  stocks,
}: {
  directOnly: boolean;
  lines: IssueLine[];
  onResetLines: () => void;
  stocks: StockOption[];
}) {
  const [issueType, setIssueType] = useState<IssueType>(
    directOnly ? "DIRECT" : "CM_REFERENCED",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [formError, setFormError] = useState("");
  const submittingRef = useRef(false);
  const [submissionKey, setSubmissionKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSubmissionKey(createSubmissionKey());
  }, []);

  function openReview() {
    if (!formRef.current?.reportValidity()) return;

    const validationError = validateIssueLines(lines, stocks);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    setReviewMode(true);
  }

  function closeReview() {
    setReviewMode(false);
  }

  function resetFormView() {
    setIssueType(directOnly ? "DIRECT" : "CM_REFERENCED");
    onResetLines();
    setReviewMode(false);
    setFormError("");
    submittingRef.current = false;
    setIsSubmitting(false);
    setSubmissionKey(createSubmissionKey());
    formRef.current?.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (reviewMode) {
      if (submittingRef.current) {
        event.preventDefault();
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);
      return;
    }

    event.preventDefault();
    openReview();
  }

  return {
    closeReview,
    formError,
    formRef,
    handleSubmit,
    isSubmitting,
    issueType,
    openReview,
    resetFormView,
    reviewMode,
    setIssueType,
    submissionKey,
  };
}

function createSubmissionKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
