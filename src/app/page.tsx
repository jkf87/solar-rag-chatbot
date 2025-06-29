import { Sidebar } from '@/components/Sidebar'
import { ChatInterface } from '@/components/ChatInterface'

export default function Home() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  )
}
