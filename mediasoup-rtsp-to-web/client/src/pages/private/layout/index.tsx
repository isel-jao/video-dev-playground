import { Upbar } from "@/components/upbar";
import { Outlet } from "react-router";

export default function PrivateLayout() {
  return (
    <main className="pt-upbar">
      <Upbar className="fixed top-0 w-full left-0" />
      <Outlet />
    </main>
  );
}
