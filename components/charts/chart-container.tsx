"use client";

import { cloneElement, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ChartContainer({
  children,
  className,
}: {
  children: React.ReactElement<{ height?: number; width?: number }>;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ height: number; width: number } | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);

      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={cn("h-full w-full min-h-[320px]", className)}>
      {size ? (
        cloneElement(children, { height: size.height, width: size.width })
      ) : (
        <div className="h-full w-full animate-pulse rounded-[1.25rem] bg-muted/40" />
      )}
    </div>
  );
}
