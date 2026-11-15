import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Download, Trash2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BoardSettings } from '@/api'
import type { Member, Task, TaskStatus } from '@/types'
import { COLUMNS } from '@/types'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: BoardSettings
  onSaveSettings: (patch: Partial<BoardSettings>) => Promise<void>
  members: Member[]
  userId: string
  onChangeUser: (id: string) => void
  tasks: Task[]
  onTasksChange: (value: Task[] | ((prev: Task[]) => Task[])) => void
}

function SavedNote({ show }: { show: boolean }) {
  return show ? (
    <span className="text-xs text-green-700" data-testid="settings-saved">
      Saved
    </span>
  ) : null
}

function ProfileTab({ members, userId, onChangeUser }: Pick<SettingsDialogProps, 'members' | 'userId' | 'onChangeUser'>) {
  const [draft, setDraft] = useState(userId)
  const [saved, setSaved] = useState(false)
  const active = members.filter((m) => m.status === 'active')
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="settings-user">Signed in as</Label>
        <Select value={draft} onValueChange={(v) => { setDraft(v); setSaved(false) }}>
          <SelectTrigger id="settings-user">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {active.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} ({m.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Likes, comments and uploads are made as this person.</p>
      </div>
      <div className="flex items-center justify-end gap-3">
        <SavedNote show={saved} />
        <Button size="sm" data-testid="settings-profile-save" onClick={() => { onChangeUser(draft); setSaved(true) }}>
          Save profile
        </Button>
      </div>
    </div>
  )
}

function NotificationsTab({ settings, onSaveSettings }: Pick<SettingsDialogProps, 'settings' | 'onSaveSettings'>) {
  const [draft, setDraft] = useState(settings.notifications)
  const [saved, setSaved] = useState(false)
  const rows: { key: keyof BoardSettings['notifications']; label: string; hint: string }[] = [
    { key: 'mentions', label: 'Mentions', hint: 'When someone addresses a comment to you' },
    { key: 'dailyDigest', label: 'Daily digest', hint: 'One email every morning with your open tasks' },
    { key: 'weeklyReport', label: 'Weekly report', hint: 'Board summary every Monday' },
  ]
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <label key={r.key} className="flex items-start gap-3 rounded-md border p-3">
          <input
            type="checkbox"
            id={`settings-notify-${r.key}`}
            className="mt-0.5 h-4 w-4"
            checked={draft[r.key]}
            onChange={(e) => { setDraft((d) => ({ ...d, [r.key]: e.target.checked })); setSaved(false) }}
          />
          <span>
            <span className="block text-sm font-medium">{r.label}</span>
            <span className="block text-xs text-muted-foreground">{r.hint}</span>
          </span>
        </label>
      ))}
      <div className="flex items-center justify-end gap-3">
        <SavedNote show={saved} />
        <Button
          size="sm"
          data-testid="settings-notifications-save"
          onClick={async () => { await onSaveSettings({ notifications: draft }); setSaved(true) }}
        >
          Save notifications
        </Button>
      </div>
    </div>
  )
}

function BoardTab({ settings, onSaveSettings }: Pick<SettingsDialogProps, 'settings' | 'onSaveSettings'>) {
  const [rulesOpen, setRulesOpen] = useState(false)
  const [limits, setLimits] = useState<Record<TaskStatus, string>>(
    () => Object.fromEntries(COLUMNS.map((c) => [c.id, settings.wipLimits[c.id]?.toString() ?? ''])) as Record<TaskStatus, string>
  )
  const [showOverdue, setShowOverdue] = useState(settings.showOverdue)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    const wipLimits = {} as Record<TaskStatus, number | null>
    for (const c of COLUMNS) {
      const v = limits[c.id].trim()
      if (v && (!/^\d+$/.test(v) || Number(v) < 1)) {
        setError(`${c.label}: limit must be a whole number of 1 or more`)
        return
      }
      wipLimits[c.id] = v ? Number(v) : null
    }
    setError('')
    await onSaveSettings({ wipLimits, showOverdue })
    setSaved(true)
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-md border p-3">
        <input
          type="checkbox"
          id="settings-show-overdue"
          className="mt-0.5 h-4 w-4"
          checked={showOverdue}
          onChange={(e) => { setShowOverdue(e.target.checked); setSaved(false) }}
        />
        <span>
          <span className="block text-sm font-medium">Highlight overdue tasks</span>
          <span className="block text-xs text-muted-foreground">Show an Overdue badge on cards past their due date</span>
        </span>
      </label>

      <div className="rounded-md border">
        <button
          type="button"
          data-testid="settings-column-rules-toggle"
          aria-expanded={rulesOpen}
          onClick={() => setRulesOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium"
        >
          {rulesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Column rules
        </button>
        {rulesOpen && (
          <div className="space-y-3 border-t p-3">
            <p className="text-xs text-muted-foreground">
              Work-in-progress limit: the most cards a column may hold. Leave empty for no limit.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COLUMNS.map((c) => (
                <div key={c.id} className="space-y-1">
                  <Label htmlFor={`settings-wip-${c.id}`} className="text-xs">
                    {c.label}
                  </Label>
                  <Input
                    id={`settings-wip-${c.id}`}
                    inputMode="numeric"
                    placeholder="No limit"
                    value={limits[c.id]}
                    onChange={(e) => { setLimits((l) => ({ ...l, [c.id]: e.target.value })); setSaved(false) }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <SavedNote show={saved} />
        <Button size="sm" data-testid="settings-board-save" onClick={save}>
          Save board settings
        </Button>
      </div>
    </div>
  )
}

function AdvancedTab({ tasks, onTasksChange }: Pick<SettingsDialogProps, 'tasks' | 'onTasksChange'>) {
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement | null>(null)

  const exportBoard = () => {
    const blob = new Blob([JSON.stringify({ version: 1, tasks }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'board-export.json'
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage(`Exported ${tasks.length} tasks`)
  }

  const importBoard = async (file: File | undefined) => {
    if (!file) return
    const data = JSON.parse(await file.text()) as { tasks?: Task[] }
    const incoming = data.tasks ?? []
    onTasksChange((prev) => [...prev, ...incoming])
    setMessage(`Imported ${incoming.length} tasks`)
    if (input.current) input.current.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Board data</p>
        <p className="text-xs text-muted-foreground">Move the board to another browser, or keep a copy.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" data-testid="settings-export-board" onClick={exportBoard}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export board
          </Button>
          <Button size="sm" variant="outline" data-testid="settings-import-board" onClick={() => input.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            Import board
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="settings-import-input"
            onChange={(e) => importBoard(e.target.files?.[0])}
          />
        </div>
        {message && (
          <p className="text-xs text-muted-foreground" data-testid="settings-board-data-message">
            {message}
          </p>
        )}
      </div>
      <div className="space-y-2 rounded-md border border-destructive/40 p-3">
        <p className="text-sm font-medium text-destructive">Danger zone</p>
        <p className="text-xs text-muted-foreground">Removes every card from the board.</p>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/40 text-destructive"
          data-testid="settings-clear-board"
          onClick={() => {
            onTasksChange([])
            setMessage('Board cleared')
          }}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Clear board
        </Button>
      </div>
    </div>
  )
}

export function SettingsDialog(props: SettingsDialogProps) {
  const { open, onOpenChange } = props
  const [tab, setTab] = useState('profile')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" closeButtonTestId="settings-close-button">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>Your profile, notifications and how the board behaves.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" data-testid="settings-tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="settings-tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="board" data-testid="settings-tab-board">Board</TabsTrigger>
            <TabsTrigger value="advanced" data-testid="settings-tab-advanced">Advanced</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <ProfileTab members={props.members} userId={props.userId} onChangeUser={props.onChangeUser} />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsTab settings={props.settings} onSaveSettings={props.onSaveSettings} />
          </TabsContent>
          <TabsContent value="board">
            <BoardTab settings={props.settings} onSaveSettings={props.onSaveSettings} />
          </TabsContent>
          <TabsContent value="advanced">
            <AdvancedTab tasks={props.tasks} onTasksChange={props.onTasksChange} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
