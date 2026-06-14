"use client";

import { useAuth } from "./auth";
import { ROLE_LABEL } from "@/lib/constants";
import { LogOut } from "lucide-react";

export function UserChip() {
  const { session, logout } = useAuth();
  if (!session) return null;

  const initials = session.name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-medium">{session.name}</span>
        <span className="text-xs text-muted-foreground">
          {ROLE_LABEL[session.role]}
        </span>
      </div>
      <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
        {initials}
      </div>
      <button
        onClick={() => {
          logout();
          // Толук навигация — RequireRole сакчысы /login'ге багыттабашы үчүн
          window.location.assign("/");
        }}
        title="Чыгуу"
        className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-danger"
      >
        <LogOut className="size-4.5" />
      </button>
    </div>
  );
}
