import { TodoItem } from '../types/chat'

interface TodoTableProps {
  todos: TodoItem[]
}

export const TodoTable = ({ todos }: TodoTableProps) => {
  if (!todos || todos.length === 0) {
    return null
  }

  // Calculate statistics
  const completed = todos.filter(t => t.status === 'completed').length
  const inProgress = todos.filter(t => t.status === 'in_progress').length
  const pending = todos.filter(t => t.status === 'pending').length
  const total = todos.length

  // Progress percentage
  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const progressWidth = `${progressPercentage}%`

  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'in_progress':
        return '🔧'
      case 'pending':
        return '⏳'
      default:
        return '⏳'
    }
  }

  const getStatusColor = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-50'
      case 'pending':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return 'In Progress'
      case 'pending':
        return 'Pending'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Progress Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-700">
            📋 Todo Progress: {completed}/{total} completed
          </div>
          <div className="text-xs text-gray-500">
            {inProgress} in progress, {pending} pending
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: progressWidth }}
          />
        </div>
        <div className="text-xs text-gray-600 mt-1 text-right">{progressPercentage}%</div>
      </div>

      {/* Todo Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Task
              </th>
            </tr>
          </thead>
          <tbody className="bg-amber divide-y divide-gray-200">
            {todos.map((todo, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                  {index + 1}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      todo.status
                    )}`}
                  >
                    <span className="mr-1">{getStatusIcon(todo.status)}</span>
                    {getStatusText(todo.status)}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-800">{todo.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

