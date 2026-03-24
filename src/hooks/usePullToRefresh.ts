import { useState, useRef, useEffect, useCallback } from "react";

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const el = useRef<HTMLDivElement | null>(null);

  const stableRefresh = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchEnd = async (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientY - startY.current;
      if (diff > 80 && window.scrollY === 0 && !refreshing) {
        setRefreshing(true);
        try {
          await stableRefresh();
        } finally {
          setRefreshing(false);
        }
      }
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, [stableRefresh, refreshing]);

  return { refreshing, ref: el };
}
