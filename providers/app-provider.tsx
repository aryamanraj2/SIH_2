"use client"

import type React from "react"
import { createContext, useContext, useMemo, useState } from "react"
import type { DPRFile, ProcessingResult, LanguageOption } from "@/lib/types"
import * as api from "@/lib/api"

type AppContextType = {
  isAuthenticated: boolean
  userEmail?: string
  dprs: DPRFile[]
  results: Record<string, ProcessingResult | undefined>
  defaultLanguage: LanguageOption
  setDefaultLanguage: (lang: LanguageOption) => void
  login: (email: string) => void
  logout: () => void
  addDpr: (dpr: DPRFile) => void
  setResult: (id: string, result: ProcessingResult) => void
  listDprs: typeof api.listDPRs
  getResults: typeof api.getResults
  exportPDF: typeof api.exportPDF
  exportExcel: typeof api.exportExcel
  getJSON: typeof api.getJSON
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [dprs, setDprs] = useState<DPRFile[]>([])
  const [results, setResults] = useState<Record<string, ProcessingResult | undefined>>({})
  const [defaultLanguage, setDefaultLanguage] = useState<LanguageOption>("EN")

  const value = useMemo<AppContextType>(() => {
    return {
      isAuthenticated,
      userEmail,
      dprs,
      results,
      defaultLanguage,
      setDefaultLanguage,
      login: (email: string) => {
        setIsAuthenticated(true)
        setUserEmail(email)
      },
      logout: () => {
        setIsAuthenticated(false)
        setUserEmail(undefined)
      },
      addDpr: (dpr: DPRFile) => setDprs((prev) => [dpr, ...prev]),
      setResult: (id: string, result: ProcessingResult) => setResults((prev) => ({ ...prev, [id]: result })),
      listDprs: api.listDPRs,
      getResults: api.getResults,
      exportPDF: api.exportPDF,
      exportExcel: api.exportExcel,
      getJSON: api.getJSON,
    }
  }, [isAuthenticated, userEmail, dprs, results, defaultLanguage])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
