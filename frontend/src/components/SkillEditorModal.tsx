import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Skill } from '../types/skill'
import { useCreateSkill, useUpdateSkill } from '../hooks/useSkills'

interface SkillEditorModalProps {
  skill?: Skill
  onClose: () => void
}

export const SkillEditorModal = ({ skill, onClose }: SkillEditorModalProps) => {
  const [title, setTitle] = useState(skill?.title || '')
  const [content, setContent] = useState(skill?.content || '')
  const [error, setError] = useState('')

  const createSkill = useCreateSkill()
  const updateSkill = useUpdateSkill()

  const isEditing = !!skill

  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setError('')

    if (isEditing) {
      // Update existing skill
      updateSkill.mutate(
        { id: skill._id, data: { title, content } },
        {
          onSuccess: () => {
            onClose()
          },
          onError: () => {
            setError('Failed to update skill')
          }
        }
      )
    } else {
      // Create new skill
      createSkill.mutate(
        { title, content },
        {
          onSuccess: () => {
            onClose()
          },
          onError: () => {
            setError('Failed to create skill')
          }
        }
      )
    }
  }

  const isPending = createSkill.isPending || updateSkill.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-message-assistant rounded-2xl dark:rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-nouveau-cream">
              {isEditing ? 'Edit Skill' : 'Create New Skill'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 bg-nouveau-lavender-500 dark:bg-deco-gold text-white dark:text-deco-navy rounded-lg hover:bg-nouveau-lavender-600 dark:hover:bg-deco-gold/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="mt-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Skill title..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-nouveau-lavender-500 dark:focus:ring-deco-gold"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Editor and Preview Side by Side */}
        <div className="flex-1 overflow-hidden flex">
          {/* Editor Pane */}
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Markdown Editor
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your markdown content here..."
                className="w-full h-full min-h-[400px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-nouveau-lavender-500 dark:focus:ring-deco-gold font-mono text-sm resize-none"
              />
            </div>
          </div>

          {/* Preview Pane */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Preview
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="prose prose-base dark:prose-invert max-w-none">
                {content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ inline, className, children, ...props }: any) {
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
                      h1: (props) => <h1 className="text-xl font-bold mt-4 mb-2 dark:text-gray-100" {...props} />,
                      h2: (props) => <h2 className="text-lg font-bold mt-3 mb-2 dark:text-gray-100" {...props} />,
                      h3: (props) => <h3 className="text-base font-bold mt-2 mb-1 dark:text-gray-100" {...props} />,
                      p: (props) => <p className="my-2 dark:text-gray-200" {...props} />,
                      ul: (props) => <ul className="list-disc list-inside my-2 space-y-1 dark:text-gray-200" {...props} />,
                      ol: (props) => <ol className="list-decimal list-inside my-2 space-y-1 dark:text-gray-200" {...props} />,
                      li: (props) => <li className="ml-2" {...props} />,
                      a: (props) => <a className="text-nouveau-lavender-500 dark:text-deco-gold hover:underline" {...props} />,
                      blockquote: (props) => (
                        <blockquote className="border-l-4 border-nouveau-sage dark:border-deco-gold pl-4 my-2 italic text-gray-700 dark:text-gray-300" {...props} />
                      ),
                      hr: (props) => <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />,
                      strong: (props) => <strong className="font-bold dark:text-gray-100" {...props} />,
                      em: (props) => <em className="italic" {...props} />,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic">
                    Preview will appear here...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

