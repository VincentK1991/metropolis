import { createFileRoute } from '@tanstack/react-router'
import { WorkflowPage } from '../components/WorkflowPage'

export const Route = createFileRoute('/workflow')({
  component: Workflow,
})

function Workflow() {
  return <WorkflowPage />
}
