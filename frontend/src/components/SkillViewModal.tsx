import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Skill } from '../types/skill'

interface SkillViewModalProps {
  skill: Skill
  onClose: () => void
  onEdit: (skill: Skill) => void
}

export const SkillViewModal = ({ skill, onClose, onEdit }: SkillViewModalProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-message-assistant rounded-2xl dark:rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-nouveau-cream">
                {skill.title}
              </h2>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Created: {new Date(skill.created_at).toLocaleString()}</span>
                <span>Updated: {new Date(skill.updated_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(skill)}
                className="px-4 py-2 bg-nouveau-lavender-500 dark:bg-deco-gold text-white dark:text-deco-navy rounded-lg hover:bg-nouveau-lavender-600 dark:hover:bg-deco-gold/90 transition-colors text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="prose prose-base dark:prose-invert max-w-none">
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
              {skill.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

