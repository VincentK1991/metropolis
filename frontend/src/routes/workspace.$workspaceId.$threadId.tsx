/**
 * Workspace thread route - /workspace/:workspaceId/:threadId
 */

import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceThreadPanel } from '../components/WorkspaceThreadPanel'

export const Route = createFileRoute('/workspace/$workspaceId/$threadId')({
  component: () => {
    const { workspaceId, threadId } = Route.useParams()
    return <WorkspaceThreadPanel workspaceId={workspaceId} threadId={threadId} />
  },
})
