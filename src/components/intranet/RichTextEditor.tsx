import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (!editorRef.current.innerHTML && value) {
        editorRef.current.innerHTML = value
      }
    }
  }, [value])

  const handleCommand = (cmd: string) => {
    document.execCommand(cmd, false, '')
    editorRef.current?.focus()
    onChange(editorRef.current?.innerHTML || '')
  }

  return (
    <div className="border rounded-md bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex gap-1 p-1 border-b bg-slate-50">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => handleCommand('bold')}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => handleCommand('italic')}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => handleCommand('insertUnorderedList')}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => handleCommand('insertOrderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-3 min-h-[120px] max-h-[300px] overflow-y-auto focus:outline-none text-sm prose prose-sm max-w-none"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
      />
    </div>
  )
}
