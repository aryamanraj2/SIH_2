"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/providers/app-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { MoreHorizontal, Download, RotateCcw, Archive, Trash2, Eye } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { listArchivedFiles, restoreFile, deleteFile, downloadFile, archiveFile } from "@/lib/api"
import { type ArchivedFile, type DPRFile } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export default function ArchivePage() {
  const { listDprs } = useApp()
  const [q, setQ] = useState("")
  const [activeFiles, setActiveFiles] = useState<DPRFile[]>([])
  const [archivedFiles, setArchivedFiles] = useState<ArchivedFile[]>([])
  const [loading, setLoading] = useState(false)

  const loadActiveFiles = async () => {
    try {
      const data = await listDprs({ q, includeArchived: false })
      setActiveFiles(data)
    } catch (error) {
      console.error('Error loading active files:', error)
      toast({
        title: "Error",
        description: "Failed to load active files",
        variant: "destructive"
      })
    }
  }

  const loadArchivedFiles = async () => {
    try {
      const data = await listArchivedFiles()
      // Filter by search query
      const filtered = q ? data.filter(file => 
        file.originalFilename.toLowerCase().includes(q.toLowerCase())
      ) : data
      setArchivedFiles(filtered)
    } catch (error) {
      console.error('Error loading archived files:', error)
      toast({
        title: "Error", 
        description: "Failed to load archived files",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadActiveFiles()
    loadArchivedFiles()
  }, [q])

  const handleArchive = async (file: DPRFile, reason?: string) => {
    if (!file.uploadId) return
    
    setLoading(true)
    try {
      await archiveFile(file.uploadId, { reason })
      toast({
        title: "Success",
        description: `${file.filename} has been archived`
      })
      loadActiveFiles()
      loadArchivedFiles()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive file",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (file: ArchivedFile) => {
    setLoading(true)
    try {
      await restoreFile(file.uploadId)
      toast({
        title: "Success",
        description: `${file.originalFilename} has been restored`
      })
      loadActiveFiles()
      loadArchivedFiles()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore file",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (uploadId: string, filename: string) => {
    setLoading(true)
    try {
      await deleteFile(uploadId)
      toast({
        title: "Success",
        description: `${filename} has been permanently deleted`
      })
      loadActiveFiles()
      loadArchivedFiles()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (uploadId: string, filename: string) => {
    try {
      await downloadFile(uploadId)
      toast({
        title: "Success",
        description: `${filename} download started`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">File Archive</h1>
          <p className="text-sm text-muted-foreground">Manage your uploaded DPR files and archived documents</p>
        </div>
        <Input 
          placeholder="Search filename..." 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          className="w-56" 
        />
      </header>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active Files ({activeFiles.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived Files ({archivedFiles.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          <div className="grid gap-4">
            {activeFiles.length === 0 && (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  {q ? "No files match your search." : "No active files. Upload a DPR from the Upload tab."}
                </CardContent>
              </Card>
            )}
            {activeFiles.map((file) => (
              <Card key={file.id} className="transition-colors hover:bg-secondary/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{file.filename}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={file.hasResults ? "default" : "secondary"}>
                        {file.analysisStatus || file.status}
                      </Badge>
                      {file.hasScoreAnalysis && (
                        <Badge variant="outline">
                          Score: {file.scorePercentage}%
                        </Badge>
                      )}
                      {file.isArchived && (
                        <Badge variant="destructive">Archived</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/results?id=${file.uploadId || file.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Results
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => file.uploadId && handleDownload(file.uploadId, file.filename)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(file, "User archived from dashboard")}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete File</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete "{file.filename}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => file.uploadId && handleDelete(file.uploadId, file.filename)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <div>Uploaded: {new Date(file.uploadedAt).toLocaleString()}</div>
                      {file.processedAt && (
                        <div>Processed: {new Date(file.processedAt).toLocaleString()}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div>Size: {formatFileSize(file.fileSize || file.sizeBytes || 0)}</div>
                      <div>Language: {file.language}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          <div className="grid gap-4">
            {archivedFiles.length === 0 && (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  {q ? "No archived files match your search." : "No archived files yet."}
                </CardContent>
              </Card>
            )}
            {archivedFiles.map((file) => (
              <Card key={file.id} className="transition-colors hover:bg-secondary/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{file.originalFilename}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">Archived</Badge>
                      <Badge variant={file.hasResults ? "default" : "outline"}>
                        {file.analysisStatus}
                      </Badge>
                      {file.accessCount > 0 && (
                        <Badge variant="outline">
                          Accessed {file.accessCount} times
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/results?id=${file.uploadId}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Results
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(file.uploadId, file.originalFilename)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRestore(file)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Permanently</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete "{file.originalFilename}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(file.uploadId, file.originalFilename)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <div>Uploaded: {new Date(file.uploadedAt).toLocaleString()}</div>
                      <div>Archived: {new Date(file.archivedAt).toLocaleString()}</div>
                      {file.lastAccessed && (
                        <div>Last accessed: {new Date(file.lastAccessed).toLocaleString()}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div>Size: {formatFileSize(file.fileSize)}</div>
                      {file.archiveReason && (
                        <div>Reason: {file.archiveReason}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
