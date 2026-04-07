"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

export function ChartContainer({
  children,
  className,
}: {
  children: React.ReactElement;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("h-full w-full min-h-[320px]", className)}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={320}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full animate-pulse rounded-[1.25rem] bg-muted/40" />
      )}
    </div>
  );
}
