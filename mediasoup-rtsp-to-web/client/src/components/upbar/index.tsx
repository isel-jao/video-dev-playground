import { NavLink, useLocation } from "react-router";

import React from "react";
import { twMerge } from "tailwind-merge";
import { cn } from "@/lib/utils/functions";

const links = [
  {
    to: "/",
    label: "Home",
  },
  {
    to: "/about",
    label: "About",
  },
  {
    to: "/contact",
    label: "Contact",
  },
];

interface UpbarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  ref?: React.RefObject<HTMLDivElement | null>;
}

export function Upbar({ className, ...props }: UpbarProps) {
  const { pathname } = useLocation();
  return (
    <div className={twMerge("h-upbar bg-card border-b", className)} {...props}>
      <div className="container  px-container flex h-full items-center gap-4">
        {links.map((lind) => (
          <NavLink key={lind.to} to={lind.to}>
            <span
              className={cn("capitalize font-semibold", {
                "text-primary": pathname === lind.to,
              })}
            >
              {lind.label}
            </span>
          </NavLink>
        ))}
        <NavLink to="/login" className="ml-auto">
          <span
            className={cn("capitalize font-semibold", {
              "text-primary": pathname === "/login",
            })}
          >
            logout
          </span>
        </NavLink>
      </div>
    </div>
  );
}
