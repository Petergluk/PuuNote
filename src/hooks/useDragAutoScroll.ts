import { useEffect } from "react";

export function useDragAutoScroll() {
  useEffect(() => {
    let scrollInterval: number | null = null;

    const startScroll = (el: Element, dy: number) => {
      if (scrollInterval) clearInterval(scrollInterval);
      scrollInterval = window.setInterval(() => {
        el.scrollTop += dy;
      }, 16);
    };

    const stopScroll = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      const el = (e.target as Element).closest(".column-container");
      if (!el) {
        stopScroll();
        return;
      }

      const rect = el.getBoundingClientRect();
      const edgeSize = 180;
      const speed = 40;

      const topDist = e.clientY - rect.top;
      const bottomDist = rect.bottom - e.clientY;

      if (topDist > 0 && topDist < edgeSize) {
        startScroll(el, -speed * (1 - topDist / edgeSize));
      } else if (bottomDist > 0 && bottomDist < edgeSize) {
        startScroll(el, speed * (1 - bottomDist / edgeSize));
      } else {
        stopScroll();
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!(e.relatedTarget instanceof Node) || !document.contains(e.relatedTarget)) {
          stopScroll();
      }
    };

    const handleDrop = () => stopScroll();
    const handleDragEnd = () => stopScroll();

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    document.addEventListener("dragend", handleDragEnd);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
      document.removeEventListener("dragend", handleDragEnd);
      stopScroll();
    };
  }, []);
}
