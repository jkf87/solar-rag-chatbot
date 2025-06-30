'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker - use a stable CDN version that exists
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
// Simple SVG icons as components
const Upload = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7,10 12,15 17,10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
)

const FileText = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14,2 L14,8 L20,8 M14,2 L20,8 L20,22 L4,22 L4,2 L14,2 Z"></path>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10,9 9,9 8,9"></polyline>
  </svg>
)

const Loader2 = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12A9 9 0 1 1 12 3"></path>
  </svg>
)

const Check = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
)

const X = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

export function FileUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Client-side PDF parsing function
  const parsePDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n\n'
    }
    
    return fullText.trim()
  }

  const handleFiles = async (fileList: FileList) => {
    console.log('📁 파일 업로드 시작:', fileList.length, '개 파일')
    alert(`🚨 디버그: 파일 업로드 시작 - ${fileList.length}개 파일`)
    
    const acceptedFiles = Array.from(fileList).filter(file => {
      if (file.type === 'application/pdf') {
        console.log('✅ PDF 파일 승인됨:', file.name, `${(file.size / 1024).toFixed(1)}KB`)
        return true
      } else {
        console.log('❌ PDF가 아닌 파일 거부됨:', file.name, file.type)
        return false
      }
    })
    
    if (acceptedFiles.length === 0) {
      console.log('⚠️ 업로드할 유효한 파일이 없음')
      alert('Please select PDF files only.')
      return
    }
    
    const newFiles = acceptedFiles.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: 'uploading' as const,
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
    console.log('📋 파일 상태 초기화 완료:', newFiles.length, '개 파일')

    // Process each file with client-side parsing
    for (const file of acceptedFiles) {
      const fileId = newFiles.find(f => f.name === file.name)?.id
      if (!fileId) continue

      console.log(`🔄 파일 처리 시작: ${file.name}`)

      try {
        // Update status to parsing
        console.log(`📖 PDF 파싱 시작: ${file.name}`)
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'uploading', progress: 10 } : f
        ))

        // Parse PDF on client-side
        const extractedText = await parsePDF(file)
        console.log(`✅ PDF 파싱 완료: ${file.name} - 텍스트 길이: ${extractedText.length}자`)
        
        // Update status to processing
        console.log(`🚀 서버 업로드 시작: ${file.name}`)
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'processing', progress: 50 } : f
        ))

        // Send parsed text to server for embedding and storage
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            extractedText: extractedText
          }),
        })

        console.log(`📡 서버 응답 수신: ${file.name} - 상태: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ 서버 오류: ${file.name} - ${response.status}: ${errorText}`)
          throw new Error('Processing failed')
        }

        const result = await response.json()
        console.log(`🎉 파일 처리 완료: ${file.name}`, result)

        // Update status to completed
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f
        ))

        console.log(`✅ UI 업데이트 완료: ${file.name} - 상태: completed`)

      } catch (error) {
        console.error(`💥 파일 처리 실패: ${file.name}`, error)
        alert(`🚨 오류 발생: ${file.name} - ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'error', 
            progress: 0, 
            error: error instanceof Error ? error.message : 'Unknown error'
          } : f
        ))
      }
    }
    
    console.log('🏁 전체 파일 업로드 프로세스 완료')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload PDF Documents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragOver ? (
              <p className="text-lg font-medium">Drop the PDF files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop PDF files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Support for multiple PDF files
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    {file.status === 'uploading' || file.status === 'processing' ? (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2 transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {file.progress}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {file.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                        </p>
                      </div>
                    ) : null}
                    {file.error && (
                      <p className="text-sm text-destructive mt-1">{file.error}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'uploading' || file.status === 'processing' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : file.status === 'completed' ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : file.status === 'error' ? (
                      <X className="w-5 h-5 text-destructive" />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}