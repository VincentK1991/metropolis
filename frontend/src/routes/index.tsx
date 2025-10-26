/**
 * Workspace list route - / (home page)
 */

import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceList } from '../components/WorkspaceList'

export const Route = createFileRoute('/')({
  component: WorkspaceList,
})
