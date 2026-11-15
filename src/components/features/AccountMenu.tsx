import { useEffect, useRef, useState } from 'react'
import { HelpCircle, Settings } from 'lucide-react'
import type { Member } from '@/types'
import { getAvatarInitials } from '@/seed-data'

interface AccountMenuProps {
  user: Member | undefined
  onOpenSettings: () => void
}

export function AccountMenu({ user, onOpenSettings }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        data-testid="account-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
      >
        {user ? getAvatarInitials(user.name) : '?'}
      </button>
      {open && (
        <div
          role="menu"
          data-agrune-demo="account-menu"
          className="absolute right-0 z-40 mt-2 w-56 rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="font-medium" data-testid="account-user-name">{user?.name ?? 'Nobody'}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            data-testid="account-menu-settings"
            className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left hover:bg-muted"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
          >
            <Settings className="h-4 w-4" />
            Workspace settings
          </button>
          <a
            role="menuitem"
            href="/docs/getting-started.html"
            target="_blank"
            rel="noreferrer"
            data-testid="account-menu-help"
            className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 hover:bg-muted"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </a>
        </div>
      )}
    </div>
  )
}
