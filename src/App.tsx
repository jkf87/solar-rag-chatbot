import { Sidebar } from '@/components/Sidebar'
import { ChatInterface } from '@/components/ChatInterface'

function App() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  )
}

export default App