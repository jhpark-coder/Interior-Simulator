import { useEffect, useState, type RefObject } from "react";

/**
 * 캔버스 컨테이너 크기. measured는 실제 크기를 처음 읽은 뒤 true가 된다.
 * 화면 맞춤은 처음 측정할 때만 하고, 이후 크기 변화(인스펙터 내용이 길어져 캔버스가
 * 늘어나는 경우 등)에는 사용자가 보던 확대·이동을 유지하도록 measured만 의존한다.
 */
export function useCanvasSize(containerRef: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 900, height: 650 });
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(420, entry.contentRect.height),
      });
      setMeasured(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  return { size, measured };
}
