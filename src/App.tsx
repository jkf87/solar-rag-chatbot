import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ChatInterface } from '@/components/ChatInterface'
import { Button } from '@/components/ui/button'

// 햄버거 메뉴 아이콘
const Menu = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
)

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 모바일 오버레이 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* 사이드바 */}
      <div className={`
        fixed md:relative z-50 md:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-full
      `}>
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 모바일 헤더 (햄버거 메뉴) */}
        <div className="md:hidden flex items-center p-4 border-b bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="mr-3"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Solar RAG Chat</h1>
        </div>
        
        <ChatInterface />
      </main>
    </div>
  )
}

export default App