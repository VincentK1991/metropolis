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
          <div className="rounded-2xl dark:rounded-lg px-4 py-3 bg-gradient-to-br from-nouveau-lavender-300 to-nouveau-rose-300 dark:from-deco-emerald dark:to-deco-gold text-gray-900 dark:text-white shadow-lg dark:shadow-lg border-3 border-nouveau-lavender-400 dark:border-deco-gold/50 transition-all duration-300">
            <div className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">You</div>
            <div className="text-base whitespace-pre-wrap break-words">
              {textContent?.content || ''}
            </div>
            <div className="text-xs mt-1 text-gray-600 dark:text-gray-300">
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
        <div className="rounded-2xl dark:rounded-lg px-4 py-3 bg-nouveau-cream-50 dark:bg-deco-navy-400 border-3 border-nouveau-sage-300 dark:border-deco-silver/40 shadow-md dark:shadow-md transition-all duration-300">
          <div className="text-sm font-semibold mb-2 text-nouveau-sage-500 dark:text-deco-gold">Assistant</div>

          {/* Render each content block */}
          {message.contents.map((content, index) => (
            <ContentBlock key={index} content={content} />
          ))}

          <div className="text-xs mt-2 text-gray-400 dark:text-gray-500">
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
    <div className="my-2 pl-3 border-l-2 border-nouveau-lavender dark:border-deco-gold">
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        💭 Thinking...
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 italic mt-1 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

const TextBlock = ({ content }: { content: string }) => {
  if (!content) return null

  return (
    <div className="my-2 text-base text-gray-800 dark:text-gray-200 prose prose-base dark:prose-invert max-w-none">
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
              <code className="bg-nouveau-lavender/20 dark:bg-deco-navy/60 text-nouveau-rose-500 dark:text-deco-gold px-1 py-0.5 rounded text-xs" {...props}>
                {children}
              </code>
            )
          },
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 dark:text-gray-100" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 dark:text-gray-100" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-2 mb-1 dark:text-gray-100" {...props} />,
          p: ({ node, ...props }) => <p className="my-2 dark:text-gray-200" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2 space-y-1 dark:text-gray-200" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2 space-y-1 dark:text-gray-200" {...props} />,
          li: ({ node, ...props }) => <li className="ml-2" {...props} />,
          a: ({ node, ...props }) => <a className="text-nouveau-lavender-500 dark:text-deco-gold hover:underline" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-nouveau-sage dark:border-deco-gold pl-4 my-2 italic text-gray-700 dark:text-gray-300" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold dark:text-gray-100" {...props} />,
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
          className="flex items-center gap-2 px-3 py-2 bg-nouveau-lavender/30 hover:bg-nouveau-lavender/50 dark:bg-deco-burgundy/30 dark:hover:bg-deco-burgundy/50 text-nouveau-lavender-500 dark:text-deco-gold rounded-lg text-sm font-medium transition-colors border border-nouveau-lavender/40 dark:border-deco-gold/40"
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
        className="flex items-center gap-2 px-3 py-2 bg-nouveau-lavender/30 hover:bg-nouveau-lavender/50 dark:bg-deco-burgundy/30 dark:hover:bg-deco-burgundy/50 text-nouveau-lavender-500 dark:text-deco-gold rounded-lg text-sm font-medium transition-colors border border-nouveau-lavender/40 dark:border-deco-gold/40"
      >
        <span>🔧</span>
        <span>{content.toolName}</span>
        <span className="ml-1">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-nouveau-cream/80 dark:bg-deco-navy/50 rounded-lg border border-nouveau-sage/30 dark:border-deco-silver/30">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Input:</div>
          <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-words">
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
        className="flex items-center gap-2 px-3 py-2 bg-nouveau-mint/30 hover:bg-nouveau-mint/50 dark:bg-deco-emerald/30 dark:hover:bg-deco-emerald/50 text-nouveau-sage-500 dark:text-deco-emerald rounded-lg text-sm font-medium transition-colors border border-nouveau-mint/40 dark:border-deco-emerald/40"
      >
        <span>📊</span>
        <span>Tool Result</span>
        <span className="ml-1">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-nouveau-cream/80 dark:bg-deco-navy/50 rounded-lg border border-nouveau-sage/30 dark:border-deco-silver/30">
          <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-words">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}
