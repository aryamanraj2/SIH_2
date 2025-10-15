"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/providers/app-provider"

export default function Home() {
  const { isAuthenticated, isMounted } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (isMounted) {
      router.replace(isAuthenticated ? "/dashboard/upload" : "/login")
    }
  }, [isAuthenticated, router, isMounted])

  // Show loading state until client has mounted
  if (!isMounted) {
    return <div>Loading...</div>
  }

  return null
}
