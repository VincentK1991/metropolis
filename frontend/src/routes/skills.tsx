import { createFileRoute } from '@tanstack/react-router'
import { SkillsPage } from '../components/SkillsPage'

export const Route = createFileRoute('/skills')({
  component: Skills,
})

function Skills() {
  return <SkillsPage />
}
