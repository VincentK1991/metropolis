import { createFileRoute } from '@tanstack/react-router'
import { ChatPanel } from '../components/ChatPanel'
import { SessionSidebar } from '../components/SessionSidebar'
import { useAgentChatContext } from '../contexts/AgentChatContext'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const {
    sessionId,
    availableSessions,
    isLoadingHistory,
    startNewSession,
    switchToSession,
  } = useAgentChatContext()

  return (
    <div className="flex h-full overflow-hidden">
      <SessionSidebar
        sessionId={sessionId}
        availableSessions={availableSessions}
        onNewSession={startNewSession}
        onSelectSession={switchToSession}
        isLoading={isLoadingHistory}
      />
      <div className="flex-1 overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  )
}
