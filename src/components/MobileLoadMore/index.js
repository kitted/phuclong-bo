import { useEffect, useRef } from "react";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

export default function MobileLoadMore({ loading, hasMore, onLoadMore }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore || loading) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin: "180px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);
  return (
    <SoftBox ref={ref} display={{ xs: "block", md: "none" }} textAlign="center" py={2} minHeight={44}>
      <SoftTypography variant="caption" color="text">
        {loading ? "Đang tải thêm..." : hasMore ? "Kéo xuống để xem thêm" : "Đã hiển thị toàn bộ"}
      </SoftTypography>
    </SoftBox>
  );
}
