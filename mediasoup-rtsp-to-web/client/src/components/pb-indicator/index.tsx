import { env } from "@/lib/env";
import React from "react";
import { twMerge } from "tailwind-merge";

interface BpIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  ref?: React.RefObject<HTMLDivElement | null>;
}

export function BpIndicator({ className, ...props }: BpIndicatorProps) {
  if (env.VITE_NODE_ENV !== "development") return null;
  return (
    <div
      {...props}
      className={twMerge(
        "after:content-['NA'] sm:after:content-['sm'] pointer-events-none md:after:content-['md'] lg:after:content-['lg'] xl:after:content-['xl'] 2xl:after:content-['2xl']",
        className
      )}
    />
  );
}
