"use client"

import { useApp } from "@/providers/app-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const { defaultLanguage, setDefaultLanguage } = useApp()

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-xl font-medium">Settings</h1>
        <p className="text-sm text-muted-foreground">These settings are local to this session.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between">
            <div className="grid gap-1">
              <Label>Notifications</Label>
              <p className="text-xs text-muted-foreground">Enable basic toasts (mock)</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="grid gap-2">
            <Label>Default Upload Language</Label>
            <Select value={defaultLanguage} onValueChange={(v) => setDefaultLanguage(v as any)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN">EN</SelectItem>
                <SelectItem value="HI">HI</SelectItem>
                <SelectItem value="Regional">Regional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
