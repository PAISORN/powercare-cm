"use client";

import { useEffect } from "react";

export function syncStockHeaderColumnWidths(sourceHeader: HTMLElement, replacementHeader: HTMLElement) {
  const sourceCells = Array.from(sourceHeader.querySelectorAll<HTMLElement>("th"));
  const replacementColumns = Array.from(replacementHeader.querySelectorAll<HTMLElement>("col"));
  if (!sourceCells.length || sourceCells.length !== replacementColumns.length) return;

  sourceCells.forEach((cell, index) => {
    replacementColumns[index].style.width = `${cell.getBoundingClientRect().width}px`;
  });
}

export function StockHeaderReplacementController({ regionId }: { regionId: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const region = document.getElementById(regionId);
    const topBar = document.querySelector<HTMLElement>("[data-app-top-bar]");
    const tableHeader = region?.querySelector<HTMLElement>("[data-stock-table-header]");
    const replacementHeader = region?.querySelector<HTMLElement>("[data-stock-replacement-header]");
    const tableScroll = region?.querySelector<HTMLElement>("[data-stock-table-scroll]");
    const table = tableScroll?.querySelector<HTMLElement>("table");
    if (!region || !topBar || !tableHeader || !replacementHeader || !tableScroll || !table) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const topBarHeight = topBar.offsetHeight + 24;
      const regionRect = region.getBoundingClientRect();
      const tableRect = tableScroll.getBoundingClientRect();
      const headerHeight = tableHeader.offsetHeight;
      const shouldReplace = regionRect.top <= topBarHeight && regionRect.bottom > headerHeight + 24;

      root.style.setProperty("--stock-app-topbar-offset", `${topBarHeight}px`);
      root.style.setProperty("--stock-replacement-header-height", `${headerHeight}px`);
      root.style.setProperty("--stock-replacement-left", `${Math.max(0, tableRect.left)}px`);
      root.style.setProperty("--stock-replacement-width", `${Math.max(0, tableRect.width)}px`);
      root.style.setProperty("--stock-replacement-table-width", `${Math.max(0, table.offsetWidth)}px`);
      root.style.setProperty("--stock-table-scroll-x", `${tableScroll.scrollLeft}px`);
      syncStockHeaderColumnWidths(tableHeader, replacementHeader);
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
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(tableScroll);
    resizeObserver?.observe(table);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      tableScroll.removeEventListener("scroll", scheduleUpdate);
      resizeObserver?.disconnect();
      delete root.dataset.stockHeaderReplacement;
      root.style.removeProperty("--stock-app-topbar-offset");
      root.style.removeProperty("--stock-replacement-header-height");
      root.style.removeProperty("--stock-replacement-left");
      root.style.removeProperty("--stock-replacement-width");
      root.style.removeProperty("--stock-replacement-table-width");
      root.style.removeProperty("--stock-table-scroll-x");
    };
  }, [regionId]);

  return null;
}
