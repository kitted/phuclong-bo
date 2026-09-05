import { useEffect, useLayoutEffect, useRef } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

const scrollContainerOf = (node) => {
  let parent = node?.parentElement;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (/(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
    parent = parent.parentElement;
  }
  return document.scrollingElement || document.documentElement;
};

export default function MobileLoadMore({ loading, hasMore, onLoadMore }) {
  const ref = useRef(null);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const onLoadMoreRef = useRef(onLoadMore);
  const intersectingRef = useRef(false);
  const scrollSnapshotRef = useRef(null);

  useEffect(() => {
    loadingRef.current = loading;
    hasMoreRef.current = hasMore;
    onLoadMoreRef.current = onLoadMore;
  }, [loading, hasMore, onLoadMore]);

  useLayoutEffect(() => {
    const snapshot = scrollSnapshotRef.current;
    if (!snapshot) return undefined;
    if (loading) {
      snapshot.loadingObserved = true;
      return undefined;
    }
    if (!snapshot.loadingObserved) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const currentTop = snapshot.container.scrollTop;
      // Some lists used to disappear while the next page was loading. The
      // browser then clamped the scroll position to the top. Restore only that
      // accidental reset; never fight normal/manual scrolling.
      if (snapshot.top > 200 && currentTop < 32) snapshot.container.scrollTop = snapshot.top;
      scrollSnapshotRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading]);

  const requestNext = () => {
    if (!hasMoreRef.current || loadingRef.current) return;
    const container = scrollContainerOf(ref.current);
    scrollSnapshotRef.current = {
      container,
      top: container.scrollTop,
      loadingObserved: false,
    };
    loadingRef.current = true;
    onLoadMoreRef.current?.();
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          intersectingRef.current = false;
          return;
        }
        if (!intersectingRef.current && hasMoreRef.current && !loadingRef.current) {
          intersectingRef.current = true;
          requestNext();
        }
      },
      { rootMargin: "240px 0px 240px 0px", threshold: 0.01 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <SoftBox
      ref={ref}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      py={2}
      minHeight={58}
      sx={{ overflowAnchor: "none" }}
    >
      {loading && <CircularProgress size={22} thickness={4} />}
      {!loading && hasMore && (
        <SoftBox
          component="button"
          type="button"
          onClick={requestNext}
          px={1.5}
          py={0.65}
          sx={{
            border: "1px solid #dce3eb",
            borderRadius: 5,
            bgcolor: "#fff",
            color: "#607080",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Kéo xuống để tải thêm
        </SoftBox>
      )}
      {!loading && !hasMore && (
        <SoftTypography variant="caption" color="text">
          Đã hiển thị toàn bộ
        </SoftTypography>
      )}
    </SoftBox>
  );
}
