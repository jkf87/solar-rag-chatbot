'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { FileUploader } from './FileUploader'
// Simple SVG icons as components
const FileText = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14,2 L14,8 L20,8 M14,2 L20,8 L20,22 L4,22 L4,2 L14,2 Z"></path>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
  </svg>
)

const Settings = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
)

const Brain = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a3 3 0 0 0-3 3c0 1.5-1.5 3-3 3 0 1.5 1.5 3 3 3 0 1.5 1.5 3 3 3a3 3 0 0 0 3-3c1.5 0 3-1.5 3-3 0-1.5-1.5-3-3-3a3 3 0 0 0-3-3z"></path>
    <path d="M2 17h2m4 0h2m4 0h2m4 0h2"></path>
  </svg>
)

const DollarSign = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
)

const X = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'models' | 'settings'>('files')

  const tabs = [
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'models', label: 'Models', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="w-80 md:w-80 sm:w-72 xs:w-64 h-full border-r bg-background shadow-lg md:shadow-none">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Solar RAG Chat</h2>
          {/* 모바일에서만 보이는 닫기 버튼 */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="md:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                className="flex-1 rounded-none text-xs sm:text-sm"
                onClick={() => setActiveTab(tab.id as any)}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.charAt(0)}</span>
              </Button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {activeTab === 'files' && (
            <div className="space-y-4">
              <FileUploader />
              
              {/* Document Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Document Statistics</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Total Documents:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tokens:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Embeddings:</span>
                    <span className="font-medium">0</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">LLM Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Current Model:</label>
                      <span className="text-xs sm:text-sm text-muted-foreground">solar-pro2-preview</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Temperature:</label>
                      <span className="text-sm text-muted-foreground">0.1</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Max Tokens:</label>
                      <span className="text-sm text-muted-foreground">1000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Embedding Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Current Model:</label>
                      <span className="text-xs sm:text-sm text-muted-foreground">solar-embedding-1-large-query</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Dimensions:</label>
                      <span className="text-sm text-muted-foreground">1024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Usage & Costs
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Tokens Used:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Cost:</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Session:</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">RAG Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Chunk Size:</label>
                    <span className="text-sm text-muted-foreground">1500</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Overlap:</label>
                    <span className="text-sm text-muted-foreground">250</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Top K:</label>
                    <span className="text-sm text-muted-foreground">5</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Vector Database</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Provider:</span>
                    <span className="font-medium">Pinecone</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium text-green-600">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Index:</span>
                    <span className="font-medium">simplerag</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}