"use client"

import type React from "react"

import { type ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useApp } from "@/providers/app-provider"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Upload, Archive, BarChart, Settings, LogOut, PanelLeftClose } from "lucide-react"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login")
  }, [isAuthenticated, router])

  return (
    <div
      className={cn(
        "min-h-dvh grid grid-cols-1 transition-all duration-300 ease-in-out",
        isCollapsed ? "md:grid-cols-[56px_1fr]" : "md:grid-cols-[240px_1fr]",
      )}
    >
      <aside
        className={cn(
          "border-r bg-sidebar flex flex-col gap-4 transition-all duration-300 ease-in-out",
          isCollapsed ? "p-2" : "p-4",
        )}
      >
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          <h1 className={cn("font-semibold text-lg", isCollapsed && "hidden")}>Dashboard</h1>
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            <PanelLeftClose className={cn("size-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink href="/dashboard/upload" active={pathname?.startsWith("/dashboard/upload")} isCollapsed={isCollapsed}>
            <Upload className="size-4" />
            <span className={cn(isCollapsed && "hidden")}>Upload</span>
          </NavLink>
          <NavLink href="/dashboard/archive" active={pathname?.startsWith("/dashboard/archive")} isCollapsed={isCollapsed}>
            <Archive className="size-4" />
            <span className={cn(isCollapsed && "hidden")}>Archive</span>
          </NavLink>
          <NavLink href="/dashboard/results" active={pathname?.startsWith("/dashboard/results")} isCollapsed={isCollapsed}>
            <BarChart className="size-4" />
            <span className={cn(isCollapsed && "hidden")}>Results</span>
          </NavLink>
          <NavLink href="/dashboard/settings" active={pathname?.startsWith("/dashboard/settings")} isCollapsed={isCollapsed}>
            <Settings className="size-4" />
            <span className={cn(isCollapsed && "hidden")}>Settings</span>
          </NavLink>
        </nav>
        <div className="mt-auto">
          <Button
            variant="secondary"
            className={cn("w-full bg-muted", isCollapsed ? "justify-center" : "justify-start")}
            onClick={() => {
              logout()
              router.replace("/login")
            }}
          >
            <LogOut className="size-4" />
            <span className={cn("ml-2", isCollapsed && "hidden")}>Sign out</span>
          </Button>
        </div>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  )
}

function NavLink({
  href,
  active,
  children,
  isCollapsed,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
  isCollapsed: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors",
        isCollapsed ? "justify-center" : "",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </Link>
  )
}
