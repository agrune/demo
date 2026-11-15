import { useEffect, useRef, useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { api } from '@/api'
import { cn } from '@/lib/utils'

interface TaskReactionsProps {
  taskId: string
  userId: string
}

export function TaskReactions({ taskId, userId }: TaskReactionsProps) {
  const [up, setUp] = useState(0)
  const [down, setDown] = useState(0)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    let live = true
    api.reactions(taskId, userId).then((r) => {
      if (!live) return
      setUp(r.up)
      setDown(r.down)
      setLiked(r.mine === 'up')
      setDisliked(r.mine === 'down')
      setLoaded(true)
    })
    return () => {
      live = false
    }
  }, [taskId, userId])

  // one request at a time: clicks while one is on its way only change the screen
  const send = (kind: 'up' | 'down', on: boolean) => {
    if (pending.current) return
    pending.current = true
    api
      .react(taskId, userId, kind, on)
      .catch((error) => console.error(error))
      .finally(() => {
        pending.current = false
      })
  }

  const toggleLike = () => {
    const next = !liked
    setLiked(next)
    setUp(up + (next ? 1 : -1))
    if (next && disliked) {
      setDisliked(false)
      setDown(down - 1)
    }
    send('up', next)
  }

  const toggleDislike = () => {
    const next = !disliked
    setDisliked(next)
    setDown(down + (next ? 1 : -1))
    if (next && liked) {
      setLiked(false)
      setUp(up - 1)
    }
    send('down', next)
  }

  return (
    <div className="flex items-center gap-2" data-agrune-demo="task-reactions" aria-busy={!loaded}>
      <button
        type="button"
        data-testid="task-like-button"
        aria-pressed={liked}
        aria-label="Like"
        disabled={!loaded}
        onClick={toggleLike}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          liked ? 'border-blue-300 bg-blue-50 text-blue-700' : 'bg-background text-muted-foreground hover:bg-muted'
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span data-testid="task-like-count">{up}</span>
      </button>
      <button
        type="button"
        data-testid="task-dislike-button"
        aria-pressed={disliked}
        aria-label="Dislike"
        disabled={!loaded}
        onClick={toggleDislike}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          disliked ? 'border-red-300 bg-red-50 text-red-700' : 'bg-background text-muted-foreground hover:bg-muted'
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        <span data-testid="task-dislike-count">{down}</span>
      </button>
    </div>
  )
}
