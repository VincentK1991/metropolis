/**
 * Redirect route - /workspace redirects to / for backwards compatibility
 */

import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/')({
  component: WorkspaceRedirect,
})

function WorkspaceRedirect() {
  return <Navigate to="/" />
}
