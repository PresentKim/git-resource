import {Settings as SettingsIcon, Info, Monitor, Moon, Sun} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/shared/components/ui/dialog'
import {Button} from '@/shared/components/ui/button'
import {Input} from '@/shared/components/ui/input'
import {Label} from '@/shared/components/ui/label'
import {Slider} from '@/shared/components/ui/slider'
import {Switch} from '@/shared/components/ui/switch'

import {useGithubRateLimitStore} from '@/shared/stores/githubApiStore'
import {type Theme} from '@/shared/stores/settingStore'
import {useSettingsForm} from '@/shared/hooks/settings/useSettingsForm'
import {useSettingsSave} from '@/shared/hooks/settings/useSettingsSave'
import {useSettingsDialog} from '@/shared/hooks/settings/useSettingsDialog'

export function SettingButton() {
  const rateLimit = useGithubRateLimitStore()

  // Settings form
  const {
    githubToken,
    setGithubToken,
    columnCount,
    setColumnCount,
    pixelated,
    setPixelated,
    animationEnabled,
    setAnimationEnabled,
    theme,
    setTheme,
    gridBackground,
    setGridBackground,
    loadInitialValues,
    hasChanges,
  } = useSettingsForm()

  // Settings save
  const {handleSave} = useSettingsSave({
    formValues: {
      githubToken,
      columnCount,
      pixelated,
      animationEnabled,
      theme,
      gridBackground,
    },
    setInitialValues: loadInitialValues,
  })

  // Settings dialog
  const {isOpen, handleOpenChange} = useSettingsDialog({
    onOpen: loadInitialValues,
  })

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <DialogTrigger
        render={
          <Button aria-label="Settings" variant="ghost">
            <SettingsIcon className="size-5" />
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100vh-4rem)] w-[min(100vw-1.5rem,40rem)] overflow-y-auto border-border/70 bg-card shadow-xl shadow-black/40 sm:max-w-2xl">
        <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold">
            <span>Settings</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure how images are loaded and rendered. These settings are
            stored in your browser only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div
              data-slot="github-token-input"
              className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="githubToken"
                  className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-foreground">
                  GitHub token
                  <a
                    href="https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#primary-rate-limit-for-unauthenticated-users"
                    target="_blank"
                    rel="noreferrer">
                    <Info className="h-3.5 w-3.5 text-accent-foreground cursor-help" />
                  </a>
                </Label>
                {rateLimit.limit ? (
                  <div className="text-xs text-accent-foreground">
                    Rate limit:&nbsp;
                    <span className="font-mono">
                      {rateLimit.remaining || '-'} / {rateLimit.limit || '-'}
                    </span>
                  </div>
                ) : null}
              </div>
              <Input
                id="githubToken"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder="Paste a personal access token (optional)"
                className="h-9 text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Used to increase GitHub API rate limits and access private
                repositories. Stored unencrypted in this browser only.
              </p>
            </div>

            <div
              data-slot="column-count-slider"
              className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-[0.14em] text-foreground">
                  Columns in grid
                </Label>
                <span className="text-xs text-accent-foreground">
                  {columnCount ? `${columnCount} columns` : 'auto'}
                </span>
              </div>
              <Slider
                id="columnCount"
                min={0}
                max={20}
                step={1}
                value={[columnCount]}
                onValueChange={value => setColumnCount(value as number)}
              />
              <p className="text-xs text-muted-foreground">
                Set to{' '}
                <span className="font-mono text-accent-foreground">0</span> to
                automatically fit the screen width.
              </p>
            </div>

            <div
              data-slot="pixelated-toggle"
              className="space-y-1.5 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label
                  id="pixelated-label"
                  htmlFor="pixelated"
                  className="text-sm font-medium">
                  Pixelated images
                </Label>
                {/* The id lands on the hidden checkbox, so the switch itself is
                    named through aria-labelledby */}
                <Switch
                  id="pixelated"
                  aria-labelledby="pixelated-label"
                  checked={pixelated}
                  onCheckedChange={setPixelated}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Render images with crisp pixels, ideal for pixel-art textures.
              </p>
            </div>

            <div
              data-slot="animation-toggle"
              className="space-y-1.5 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label
                  id="animationEnabled-label"
                  htmlFor="animationEnabled"
                  className="text-sm font-medium">
                  Animate .mcmeta textures
                </Label>
                <Switch
                  id="animationEnabled"
                  aria-labelledby="animationEnabled-label"
                  checked={animationEnabled}
                  onCheckedChange={setAnimationEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Play Minecraft-style animations for textures that include a
                corresponding{' '}
                <span className="font-mono text-accent-foreground">
                  .mcmeta
                </span>{' '}
                file.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border/60 bg-background/40 p-3 min-w-0">
            <div data-slot="theme-selector" className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Theme</Label>
              <div className="flex gap-1.5 w-full min-w-0">
                {(
                  [
                    ['system', 'System', Monitor],
                    ['light', 'Light', Sun],
                    ['dark', 'Dark', Moon],
                  ] as const
                ).map(([themeValue, themeLabel, ThemeIcon]) => (
                  <Button
                    key={themeValue}
                    type="button"
                    variant={themeValue === theme ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-0 flex-1 gap-1 px-1.5"
                    aria-pressed={themeValue === theme}
                    onClick={() => setTheme(themeValue as Theme)}>
                    <ThemeIcon className="size-3.5 shrink-0" />
                    <span className="text-xs">{themeLabel}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color theme.
              </p>
            </div>

            <div
              data-slot="grid-background-selector"
              className="space-y-2 border-t border-border/50 pt-3">
              <Label className="text-sm font-medium">Grid background</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={gridBackground === 'auto' ? 'secondary' : 'outline'}
                  size="sm"
                  className="gap-1.5 justify-start"
                  onClick={() => setGridBackground('auto')}>
                  <div className="h-4 w-4 rounded border border-border shrink-0 flex items-center justify-center text-xs font-semibold">
                    A
                  </div>
                  <span className="text-xs">Auto</span>
                </Button>
                <Button
                  type="button"
                  variant={
                    gridBackground === 'transparent' ? 'secondary' : 'outline'
                  }
                  size="sm"
                  className="gap-1.5 justify-start"
                  onClick={() => setGridBackground('transparent')}>
                  <div className="h-4 w-4 rounded border border-border shrink-0 bg-transparent-grid" />
                  <span className="text-xs">Grid</span>
                </Button>
                <Button
                  type="button"
                  variant={gridBackground === 'white' ? 'secondary' : 'outline'}
                  size="sm"
                  className="gap-1.5 justify-start"
                  onClick={() => setGridBackground('white')}>
                  <div className="h-4 w-4 rounded border border-border shrink-0 bg-white" />
                  <span className="text-xs">White</span>
                </Button>
                <Button
                  type="button"
                  variant={gridBackground === 'black' ? 'secondary' : 'outline'}
                  size="sm"
                  className="gap-1.5 justify-start"
                  onClick={() => setGridBackground('black')}>
                  <div className="h-4 w-4 rounded border border-border shrink-0 bg-black" />
                  <span className="text-xs">Black</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Background color for the image grid.
              </p>
            </div>

            <p className="pt-1 text-xs text-muted-foreground/80">
              Changes are applied per browser and do not affect the underlying
              repositories.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-1 border-t border-border/60 pt-3">
          <DialogClose
            render={<Button type="button" variant="outline" size="sm" />}>
            Cancel
          </DialogClose>
          <DialogClose
            render={
              <Button
                type="button"
                variant={hasChanges ? 'default' : 'secondary'}
                size="sm"
                className="font-bold"
              />
            }
            onClick={handleSave}>
            Apply settings
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
