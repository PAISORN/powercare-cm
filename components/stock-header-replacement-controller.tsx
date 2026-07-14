"use client";

import { useEffect } from "react";

export function StockHeaderReplacementController({ regionId }: { regionId: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const region = document.getElementById(regionId);
    const topBar = document.querySelector<HTMLElement>("[data-app-top-bar]");
    const tableHeader = document.querySelector<HTMLElement>("[data-stock-table-header]");
    const tableScroll = document.querySelector<HTMLElement>("[data-stock-table-scroll]");
    const table = tableScroll?.querySelector<HTMLElement>("table");
    if (!region || !topBar || !tableHeader || !tableScroll || !table) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const topBarHeight = topBar.offsetHeight + 24;
      const regionRect = region.getBoundingClientRect();
      const tableRect = tableScroll.getBoundingClientRect();
      const headerHeight = tableHeader.offsetHeight;
      const shouldReplace = regionRect.top <= topBarHeight && regionRect.bottom > headerHeight + 24;

      root.style.setProperty("--stock-app-topbar-offset", `${topBarHeight}px`);
      root.style.setProperty("--stock-replacement-left", `${Math.max(0, tableRect.left)}px`);
      root.style.setProperty("--stock-replacement-width", `${Math.max(0, tableRect.width)}px`);
      root.style.setProperty("--stock-replacement-table-width", `${Math.max(0, table.offsetWidth)}px`);
      root.style.setProperty("--stock-table-scroll-x", `${tableScroll.scrollLeft}px`);
      if (shouldReplace) {
        root.dataset.stockHeaderReplacement = "active";
      } else {
        delete root.dataset.stockHeaderReplacement;
      }
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    tableScroll.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      tableScroll.removeEventListener("scroll", scheduleUpdate);
      delete root.dataset.stockHeaderReplacement;
      root.style.removeProperty("--stock-app-topbar-offset");
      root.style.removeProperty("--stock-replacement-left");
      root.style.removeProperty("--stock-replacement-width");
      root.style.removeProperty("--stock-replacement-table-width");
      root.style.removeProperty("--stock-table-scroll-x");
    };
  }, [regionId]);

  return null;
}
