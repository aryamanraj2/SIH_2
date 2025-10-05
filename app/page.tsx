"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/providers/app-provider"

export default function Home() {
  const { isAuthenticated } = useApp()
  const router = useRouter()

  useEffect(() => {
    router.replace(isAuthenticated ? "/dashboard/upload" : "/login")
  }, [isAuthenticated, router])

  return null
}
