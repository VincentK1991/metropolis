import { createFileRoute } from '@tanstack/react-router'
import { ChatPanel } from '../components/ChatPanel'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <ChatPanel />
      </div>
    </div>
  )
}
