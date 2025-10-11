import { useState } from 'react'
import type { ChatMessage as ChatMessageType, MessageContent, ToolUseContent, TodoContent } from '../types/chat'
import { TodoTable } from './TodoTable'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ChatMessageProps {
  message: ChatMessageType
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user'

  if (isUser) {
    // Simple user message rendering
    const textContent = message.contents.find(c => c.type === 'text')
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div className="rounded-lg px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <div className="text-xs font-semibold mb-1 text-blue-100">You</div>
            <div className="text-sm whitespace-pre-wrap break-words">
              {textContent?.content || ''}
            </div>
            <div className="text-xs mt-1 text-blue-100">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message with multiple content types
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="rounded-lg px-4 py-3 bg-white border border-gray-200">
          <div className="text-xs font-semibold mb-2 text-gray-500">Assistant</div>

          {/* Render each content block */}
          {message.contents.map((content, index) => (
            <ContentBlock key={index} content={content} />
          ))}

          <div className="text-xs mt-2 text-gray-400">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ContentBlockProps {
  content: MessageContent
}

const ContentBlock = ({ content }: ContentBlockProps) => {
  switch (content.type) {
    case 'thinking':
      return <ThinkingBlock content={content.content} />
    case 'text':
      return <TextBlock content={content.content} />
    case 'tool_use':
      return <ToolUseBlock content={content as ToolUseContent} />
    case 'tool_result':
      return <ToolResultBlock content={content.content} />
    default:
      return null
  }
}

const ThinkingBlock = ({ content }: { content: string }) => {
  if (!content) return null

  return (
    <div className="my-2 pl-3 border-l-2 border-gray-300">
      <div className="text-xs text-gray-500 italic">
        💭 Thinking...
      </div>
      <div className="text-xs text-gray-600 italic mt-1 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

const TextBlock = ({ content }: { content: string }) => {
  if (!content) return null

  return (
    <div className="my-2 text-sm text-gray-800 prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-xs" {...props}>
                {children}
              </code>
            )
          },
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-2 mb-1" {...props} />,
          p: ({ node, ...props }) => <p className="my-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="ml-2" {...props} />,
          a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-700" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="my-4 border-gray-300" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

const ToolUseBlock = ({ content }: { content: ToolUseContent }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Special handling for TodoWrite
  if (content.toolName === 'TodoWrite' && 'todos' in content) {
    const todoContent = content as TodoContent
    return (
      <div className="my-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-xs font-medium transition-colors"
        >
          <span>🔧</span>
          <span>{content.toolName}</span>
          <span className="ml-1">{isExpanded ? '▼' : '▶'}</span>
        </button>
        {isExpanded && <TodoTable todos={todoContent.todos} />}
      </div>
    )
  }

  // Regular tool use
  return (
    <div className="my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-xs font-medium transition-colors"
      >
        <span>🔧</span>
        <span>{content.toolName}</span>
        <span className="ml-1">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="text-xs font-semibold text-gray-600 mb-1">Input:</div>
          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(content.toolInput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

const ToolResultBlock = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-md text-xs font-medium transition-colors"
      >
        <span>📊</span>
        <span>Tool Result</span>
        <span className="ml-1">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}
