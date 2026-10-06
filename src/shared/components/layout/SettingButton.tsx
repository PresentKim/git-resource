import {useId, useState} from 'react'
import {Settings as SettingsIcon, Info, Monitor, Moon, Sun} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import {Button} from '@/shared/components/ui/button'
import {Input} from '@/shared/components/ui/input'
import {Label} from '@/shared/components/ui/label'
import {Switch} from '@/shared/components/ui/switch'

import {useGithubRateLimitStore} from '@/shared/stores/githubApiStore'
import {useSettingStore, type Theme} from '@/shared/stores/settingStore'
import {useSettingsDialog} from '@/shared/hooks/settings/useSettingsDialog'

const THEMES = [
  ['system', 'System', Monitor],
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
] as const

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2.5">
      <div className="space-y-0.5">
        <Label id={`${id}-label`} htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {/* The id lands on the hidden checkbox, so the switch itself is named
          through aria-labelledby */}
      <Switch
        id={id}
        aria-labelledby={`${id}-label`}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}

/**
 * The token is the one setting that is not applied as you type, so it has its
 * own Save button. Mounted only while the dialog is open, so it always starts
 * from the stored value.
 */
function TokenField() {
  const rateLimit = useGithubRateLimitStore()
  const savedToken = useSettingStore(state => state.githubToken)
  const setSavedToken = useSettingStore(state => state.setGithubToken)
  const [token, setToken] = useState(savedToken)
  const changed = token !== savedToken

  return (
    <Section title="GitHub token">
      <form
        className="space-y-2"
        onSubmit={event => {
          event.preventDefault()
          if (!changed) return
          const trimmed = token.trim()
          setToken(trimmed)
          setSavedToken(trimmed)
        }}>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="githubToken" className="text-sm font-medium">
            Personal access token
            <a
              href="https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#primary-rate-limit-for-unauthenticated-users"
              target="_blank"
              rel="noreferrer"
              aria-label="About GitHub rate limits">
              <Info className="size-3.5 text-accent-foreground" />
            </a>
          </Label>
          {rateLimit.limit ? (
            <span className="text-xs text-accent-foreground">
              Rate limit:{' '}
              <span className="font-mono">
                {rateLimit.remaining || '-'} / {rateLimit.limit || '-'}
              </span>
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Input
            id="githubToken"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={event => setToken(event.target.value)}
            placeholder="Optional"
            className="h-9 min-w-0 flex-1 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            className="h-9"
            variant={changed ? 'default' : 'secondary'}
            disabled={!changed}>
            {changed || !savedToken ? 'Save' : 'Saved'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Raises the API rate limit and lets you open private repositories.
          Stored unencrypted in this browser only.
        </p>
      </form>
    </Section>
  )
}

export function SettingButton() {
  const theme = useSettingStore(state => state.theme)
  const setTheme = useSettingStore(state => state.setTheme)
  const pixelated = useSettingStore(state => state.pixelated)
  const setPixelated = useSettingStore(state => state.setPixelated)
  const animationEnabled = useSettingStore(state => state.animationEnabled)
  const setAnimationEnabled = useSettingStore(
    state => state.setAnimationEnabled,
  )

  const {isOpen, handleOpenChange} = useSettingsDialog()

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <DialogTrigger
        render={
          <Button aria-label="Settings" variant="ghost">
            <SettingsIcon className="size-5" />
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100vh-4rem)] gap-5 overflow-y-auto border-border/70 bg-card p-5 shadow-xl shadow-black/40 sm:max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Changes apply right away and are stored in your browser only.
          </DialogDescription>
        </DialogHeader>

        <Section title="Theme">
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.map(([value, label, ThemeIcon]) => (
              <Button
                key={value}
                type="button"
                variant={value === theme ? 'default' : 'outline'}
                size="sm"
                className="min-w-0 gap-1.5"
                aria-pressed={value === theme}
                onClick={() => setTheme(value as Theme)}>
                <ThemeIcon className="size-3.5 shrink-0" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Images">
          <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-background/40">
            <SwitchRow
              label="Pixelated images"
              description="Render images with crisp pixels, ideal for pixel-art textures."
              checked={pixelated}
              onCheckedChange={setPixelated}
            />
            <SwitchRow
              label="Animate .mcmeta textures"
              description={
                <>
                  Play Minecraft-style animations for textures that have a{' '}
                  <span className="font-mono text-accent-foreground">
                    .mcmeta
                  </span>{' '}
                  file.
                </>
              }
              checked={animationEnabled}
              onCheckedChange={setAnimationEnabled}
            />
          </div>
        </Section>

        <TokenField />
      </DialogContent>
    </Dialog>
  )
}
