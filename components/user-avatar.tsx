"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";

type UserAvatarProps = {
  fullName?: string | null;
  hasPhoto?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  userId?: string | null;
  version?: string | number | null;
};

const sizeClass = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-20 w-20",
  xl: "h-36 w-36",
};

const iconSize = {
  sm: 17,
  md: 22,
  lg: 34,
  xl: 54,
};

export function UserAvatar({ fullName, hasPhoto, size = "md", userId, version }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const label = fullName ? `${fullName} profile photo` : "Profile photo";
  const initials = getInitials(fullName);
  const photoSrc = userId ? `/profile-photo/${userId}${version ? `?v=${encodeURIComponent(String(version))}` : ""}` : "";

  return (
    <span className={`${sizeClass[size]} grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-cyan-300 bg-gradient-to-br from-sky-100 to-cyan-200 text-sky-900 shadow-md ring-2 ring-white`}>
      {hasPhoto && userId && !imageFailed ? (
        <img alt={label} className="h-full w-full bg-slate-100 object-cover" src={photoSrc} onError={() => setImageFailed(true)} />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-cyan-100 to-sky-200 font-extrabold">
          {initials ? <span className={size === "sm" ? "text-xs" : size === "xl" ? "text-4xl" : "text-base"}>{initials}</span> : <UserRound aria-hidden="true" size={iconSize[size]} strokeWidth={2.2} />}
        </span>
      )}
    </span>
  );
}

function getInitials(fullName?: string | null) {
  if (!fullName) return "";
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
