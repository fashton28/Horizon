"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Settings,
  Sparkles,
  LogOut,
  FileText,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface SidebarProps {
  activeTab?: "sessions" | "resume";
  onTabChange?: (tab: "sessions" | "resume") => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const user = session?.user;
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth/login");
  };

  // Determine active state based on pathname or prop
  const isQuizActive = pathname?.startsWith("/quiz");
  const isSessionsActive = activeTab === "sessions" || (!isQuizActive && pathname === "/dashboard");
  const isResumeActive = activeTab === "resume";

  const handleSessionsClick = () => {
    if (onTabChange) {
      onTabChange("sessions");
    } else {
      router.push("/dashboard");
    }
  };

  const handleResumeClick = () => {
    if (onTabChange) {
      onTabChange("resume");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <aside
      className={`bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo & Toggle */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>
            <span className="italic">Hori</span>
            <span className="font-bold italic">zon</span>
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`h-8 w-8 rounded-lg hover:bg-sidebar-accent flex items-center justify-center transition-colors ${
            isCollapsed ? "mx-auto" : ""
          }`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/quiz")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isQuizActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
            title="Daybreak"
          >
            <BookOpen className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Daybreak</span>}
          </button>
          <button
            onClick={handleResumeClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isResumeActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
            title="Meridian"
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Meridian</span>}
          </button>
          <button
            onClick={handleSessionsClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isSessionsActive && !isQuizActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
            title="Zenith"
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Zenith</span>}
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
          </button>
        </div>
      </nav>

      {/* Usage Card */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <div className="p-4 rounded-lg bg-sidebar-accent">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Free Trial</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-sidebar-muted">Sessions</span>
                  <span>3/10</span>
                </div>
                <div className="h-1.5 bg-sidebar-border rounded-full overflow-hidden">
                  <div className="h-full w-[30%] bg-primary rounded-full" />
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-border"
            >
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Collapsed Usage indicator */}
      {isCollapsed && (
        <div className="px-3 pb-3">
          <div className="p-2 rounded-lg bg-sidebar-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={`flex items-center gap-3 p-2 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium flex-shrink-0">
            {userInitials || "U"}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-sidebar-muted truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg hover:bg-sidebar-accent flex items-center justify-center transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 text-sidebar-muted" />
              </button>
            </>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={handleLogout}
            className="w-full mt-2 h-8 rounded-lg hover:bg-sidebar-accent flex items-center justify-center transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 text-sidebar-muted" />
          </button>
        )}
      </div>
    </aside>
  );
}
