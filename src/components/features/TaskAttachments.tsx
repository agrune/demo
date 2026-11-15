import { useEffect, useRef, useState } from 'react'
import { Download, Paperclip, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { api, formatSize, type Attachment } from '@/api'

interface TaskAttachmentsProps {
  taskId: string
  userName: string
}

export function TaskAttachments({ taskId, userName }: TaskAttachmentsProps) {
  const [files, setFiles] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const input = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let live = true
    api.attachments(taskId).then((list) => {
      if (!live) return
      setFiles(list)
      setLoaded(true)
    })
    return () => {
      live = false
    }
  }, [taskId])

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    setError('')
    for (const file of Array.from(list)) {
      setUploading((n) => n + 1)
      api
        .upload(taskId, file, userName)
        .then((item) => setFiles((prev) => [...prev, item]))
        .catch((e: Error) => setError(e.message))
        .finally(() => setUploading((n) => n - 1))
    }
    if (input.current) input.current.value = ''
  }

  const remove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    api.removeAttachment(id).catch((e: Error) => setError(e.message))
  }

  return (
    <div className="space-y-2" data-agrune-demo="task-attachments" aria-busy={!loaded || uploading > 0}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments <span className="text-muted-foreground" data-testid="task-attachment-count">({files.length})</span>
        </Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="task-attach-button"
          onClick={() => input.current?.click()}
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          {uploading > 0 ? `Uploading ${uploading}…` : 'Add files'}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          data-testid="task-attach-input"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {files.map((f) => (
            <li
              key={f.id}
              data-agrune-demo="task-attachment"
              data-attachment-id={f.id}
              data-file-name={f.name}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatSize(f.size)} · {f.by} · {new Date(f.uploadedAt).toLocaleDateString('en-US')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={api.downloadUrl(f.id)}
                  download={f.name}
                  aria-label={`Download ${f.name}`}
                  data-agrune-demo="task-attachment-download"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  data-agrune-demo="task-attachment-remove"
                  onClick={() => remove(f.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          No files yet. Up to 5 files, 2 MB each.
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" data-testid="task-attachment-error">
          {error}
        </p>
      )}
    </div>
  )
}
