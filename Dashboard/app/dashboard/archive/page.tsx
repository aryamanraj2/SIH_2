"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/providers/app-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function ArchivePage() {
  const { listDprs } = useApp()
  const [q, setQ] = useState("")
  const [items, setItems] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const data = await listDprs()
      if (mounted) setItems(data)
    })()
    return () => {
      mounted = false
    }
  }, [listDprs])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const data = await listDprs({ q })
      if (mounted) setItems(data)
    })()
    return () => {
      mounted = false
    }
  }, [q, listDprs])

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Archive</h1>
          <p className="text-sm text-muted-foreground">Previously uploaded DPRs</p>
        </div>
        <Input placeholder="Search filename..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
      </header>

      <div className="grid gap-4">
        {items.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No DPRs yet. Upload one from the Upload tab.
            </CardContent>
          </Card>
        )}
        {items.map((dpr) => (
          <Card key={dpr.id} className="transition-colors hover:bg-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{dpr.filename}</CardTitle>
              <Badge variant="secondary">{dpr.status}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center justify-between">
              <div>Uploaded: {new Date(dpr.uploadedAt).toLocaleString()}</div>
              <Link href={`/dashboard/results?id=${dpr.id}`} className="underline hover:no-underline">
                Open Results
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
