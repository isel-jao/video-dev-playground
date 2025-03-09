import { Outlet } from "react-router";
import { BpIndicator } from "@/components/pb-indicator";

export default function GlobalLayout() {
  return (
    <>
      <Outlet />
      <BpIndicator className="bg-foreground text-background text-6xl opacity-5 translate-x-1/2 translate-y-1/2 size-40 rounded-xl grid place-content-center fixed z-[9999] bottom-1/2 right-1/2" />
    </>
  );
}
