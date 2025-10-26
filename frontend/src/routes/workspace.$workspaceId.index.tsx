/**
 * Workspace detail route - /workspace/:workspaceId
 */

import { createFileRoute } from '@tanstack/react-router'
import { WorkspacePage } from '../components/WorkspacePage'

export const Route = createFileRoute('/workspace/$workspaceId/')({
  component: () => {
    const { workspaceId } = Route.useParams()
    return <WorkspacePage workspaceId={workspaceId} />
  },
})
