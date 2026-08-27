"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DetailsHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

const exclusiveDetailsEvent = "powercare:exclusive-details-open";
const viewportPadding = 8;
const menuGap = 8;

export function ExclusiveDetails({ children, onToggle, ...props }: DetailsHTMLAttributes<HTMLDetailsElement>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({ left: 0, top: 0, visibility: "hidden" });
  const childItems = Children.toArray(children);
  const summary = childItems[0];
  const menu = childItems.slice(1);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const closeWhenAnotherOpens = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== detailsRef.current && detailsRef.current) {
        detailsRef.current.open = false;
        setOpen(false);
      }
    };

    document.addEventListener(exclusiveDetailsEvent, closeWhenAnotherOpens);
    return () => document.removeEventListener(exclusiveDetailsEvent, closeWhenAnotherOpens);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const positionMenu = () => {
      const summaryElement = detailsRef.current?.querySelector("summary");
      const menuElement = menuRef.current;
      if (!summaryElement || !menuElement) return;
      const triggerRect = summaryElement.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();
      const left = Math.min(
        window.innerWidth - menuRect.width - viewportPadding,
        Math.max(viewportPadding, triggerRect.right - menuRect.width),
      );
      const belowTop = triggerRect.bottom + menuGap;
      const aboveTop = triggerRect.top - menuRect.height - menuGap;
      const top = belowTop + menuRect.height <= window.innerHeight - viewportPadding
        ? belowTop
        : Math.max(viewportPadding, aboveTop);
      setMenuStyle({ left, top, visibility: "visible" });
    };

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (detailsRef.current?.contains(target) || menuRef.current?.contains(target)) return;

      if (detailsRef.current) detailsRef.current.open = false;
      setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [open]);

  return (
    <details
      {...props}
      ref={detailsRef}
      onToggle={(event) => {
        onToggle?.(event);
        const nextOpen = event.currentTarget.open;
        setOpen(nextOpen);
        if (nextOpen) {
          setMenuStyle({ left: 0, top: 0, visibility: "hidden" });
          document.dispatchEvent(new CustomEvent(exclusiveDetailsEvent, { detail: event.currentTarget }));
        }
      }}
    >
      {isValidElement(summary) ? summary : null}
      {mounted && open
        ? createPortal(
            <div
              data-exclusive-floating-menu
              ref={menuRef}
              className="fixed z-[200]"
              onPointerDownCapture={(event) => {
                const target = event.target;
                if (!(target instanceof Element) || !target.closest("a,button")) return;

                if (detailsRef.current) detailsRef.current.open = false;
                setOpen(false);
              }}
              style={menuStyle}
            >
              {menu}
            </div>,
            document.body,
          )
        : null}
    </details>
  );
}
