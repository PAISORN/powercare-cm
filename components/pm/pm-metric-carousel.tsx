"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function PmMetricCarousel({ children }: { children: ReactNode }) {
  const carouselRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || !window.matchMedia("(max-width: 639px)").matches) return;

    const initialCard = carousel.querySelector<HTMLElement>("[data-pm-metric-initial]");
    if (!initialCard) return;

    const carouselRect = carousel.getBoundingClientRect();
    const cardRect = initialCard.getBoundingClientRect();
    const centeredLeft =
      carousel.scrollLeft +
      cardRect.left -
      carouselRect.left -
      (carousel.clientWidth - cardRect.width) / 2;

    carousel.scrollTo({ left: centeredLeft, behavior: "auto" });
  }, []);

  return (
    <section
      aria-label="สรุปสถานะ PM"
      className="-mx-5 -my-6 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-6 pl-5 pt-6 scroll-smooth [scrollbar-width:none] after:block after:w-[12%] after:shrink-0 after:content-[''] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto sm:m-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:p-0 sm:after:hidden lg:grid-cols-3 xl:grid-cols-5"
      data-pm-metrics-carousel
      ref={carouselRef}
    >
      {children}
    </section>
  );
}
