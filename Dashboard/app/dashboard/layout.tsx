"use client"

import type React from "react"

import { type ReactNode, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useApp } from "@/providers/app-provider"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Upload, Archive, BarChart, Settings, LogOut } from "lucide-react"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout, userEmail } = useApp()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login")
  }, [isAuthenticated, router])

  return (
    <div className="min-h-dvh grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="border-r bg-sidebar p-4 flex flex-col gap-4">
        <div className="font-medium text-sm text-muted-foreground">{userEmail || "User"}</div>
        <nav className="flex flex-col gap-1">
          <NavLink href="/dashboard/upload" active={pathname?.startsWith("/dashboard/upload")}>
            <Upload className="size-4 mr-2" />
            Upload
          </NavLink>
          <NavLink href="/dashboard/archive" active={pathname?.startsWith("/dashboard/archive")}>
            <Archive className="size-4 mr-2" />
            Archive
          </NavLink>
          <NavLink href="/dashboard/results" active={pathname?.startsWith("/dashboard/results")}>
            <BarChart className="size-4 mr-2" />
            Results
          </NavLink>
          <NavLink href="/dashboard/settings" active={pathname?.startsWith("/dashboard/settings")}>
            <Settings className="size-4 mr-2" />
            Settings
          </NavLink>
        </nav>
        <div className="mt-auto">
          <Button
            variant="secondary"
            className="w-full justify-start bg-muted"
            onClick={() => {
              logout()
              router.replace("/login")
            }}
          >
            <LogOut className="size-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  )
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded px-3 py-2 text-sm transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </Link>
  )
}
