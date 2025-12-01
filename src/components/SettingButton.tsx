import {Settings as SettingsIcon, Info, Sun, Moon} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Slider} from '@/components/ui/slider'
import {Switch} from '@/components/ui/switch'

import {
  useSettingStore,
  type Theme,
  type GridBackground,
} from '@/stores/settingStore'
import {useGithubRateLimitStore} from '@/stores/githubApiStore'
import {useState, useMemo} from 'react'

export function SettingButton() {
  const settings = useSettingStore()
  const rateLimit = useGithubRateLimitStore()
  const [githubToken, setGithubToken] = useState('')
  const [columnCount, setColumnCount] = useState(0)
  const [pixelated, setPixelated] = useState(true)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [theme, setTheme] = useState<Theme>('dark')
  const [gridBackground, setGridBackground] = useState<GridBackground>('auto')
  const [initialValues, setInitialValues] = useState({
    githubToken: '',
    columnCount: 0,
    pixelated: true,
    animationEnabled: true,
    theme: 'dark' as Theme,
    gridBackground: 'auto' as GridBackground,
  })

  const hasChanges = useMemo(() => {
    return (
      githubToken !== initialValues.githubToken ||
      columnCount !== initialValues.columnCount ||
      pixelated !== initialValues.pixelated ||
      animationEnabled !== initialValues.animationEnabled ||
      theme !== initialValues.theme ||
      gridBackground !== initialValues.gridBackground
    )
  }, [
    githubToken,
    columnCount,
    pixelated,
    animationEnabled,
    theme,
    gridBackground,
    initialValues,
  ])

  const handleSave = () => {
    settings.setGithubToken(githubToken)
    settings.setColumnCount(columnCount)
    settings.setPixelated(pixelated)
    settings.setAnimationEnabled(animationEnabled)
    settings.setTheme(theme)
    settings.setGridBackground(gridBackground)
    // Update initial values after saving
    setInitialValues({
      githubToken,
      columnCount,
      pixelated,
      animationEnabled,
      theme,
      gridBackground,
    })
  }

  const handleOpenChange = (open: boolean) => {
    // Reset the values if the dialog is opened
    if (open) {
      const initial = {
        githubToken: settings.githubToken,
        columnCount: settings.columnCount,
        pixelated: settings.pixelated,
        animationEnabled: settings.animationEnabled,
        theme: settings.theme,
        gridBackground: settings.gridBackground,
      }
      setGithubToken(initial.githubToken)
      setColumnCount(initial.columnCount)
      setPixelated(initial.pixelated)
      setAnimationEnabled(initial.animationEnabled)
      setTheme(initial.theme)
      setGridBackground(initial.gridBackground)
      setInitialValues(initial)
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label="Settings"
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-accent/20 hover:text-accent-foreground">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={event => event.preventDefault()}
        className="max-h-[calc(100vh-4rem)] w-[min(100vw-1.5rem,40rem)] overflow-y-auto border-border/70 bg-card shadow-xl shadow-black/40 sm:max-w-2xl">
        <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold">
            <span>Viewer settings</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tune how images are loaded and rendered. These settings are stored
            in your browser only.
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
                    <Info className="h-3.5 w-3.5 text-accent cursor-help" />
                  </a>
                </Label>
                {rateLimit.limit ? (
                  <div className="text-xs text-accent">
                    rate limit:&nbsp;
                    <span className="font-mono">
                      {rateLimit.remaining || '-'} / {rateLimit.limit || '-'}
                    </span>
                  </div>
                ) : null}
              </div>
              <Input
                id="githubToken"
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder="github_pat_1234567890"
                className="h-9 text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Used to increase GitHub API rate limits and access private
                repositories.
              </p>
            </div>

            <div
              data-slot="column-count-slider"
              className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-[0.14em] text-foreground">
                  Columns in grid
                </Label>
                <span className="text-xs text-accent">
                  {columnCount ? `${columnCount} columns` : 'auto'}
                </span>
              </div>
              <Slider
                id="columnCount"
                min={0}
                max={20}
                step={1}
                value={[columnCount]}
                onValueChange={value => setColumnCount(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                Set to <span className="font-mono text-accent">0</span> to
                automatically fit the screen width.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border/60 bg-background/40 p-3 min-w-0">
            <div data-slot="theme-selector" className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Theme</Label>
              <div className="flex gap-2 w-full min-w-0">
                <Button
                  type="button"
                  variant={theme === 'light' ? 'secondary' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1.5 min-w-0"
                  onClick={() => setTheme('light')}>
                  <Sun className="h-4 w-4 shrink-0" />
                  <span className="text-xs whitespace-nowrap">Light</span>
                </Button>
                <Button
                  type="button"
                  variant={theme === 'dark' ? 'secondary' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1.5 min-w-0"
                  onClick={() => setTheme('dark')}>
                  <Moon className="h-4 w-4 shrink-0" />
                  <span className="text-xs whitespace-nowrap">Dark</span>
                </Button>
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

            <div
              data-slot="pixelated-toggle"
              className="space-y-1.5 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="pixelated" className="text-sm font-medium">
                  Pixelated images
                </Label>
                <Switch
                  id="pixelated"
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
              className="space-y-1.5 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="animationEnabled"
                  className="text-sm font-medium">
                  Animate .mcmeta textures
                </Label>
                <Switch
                  id="animationEnabled"
                  checked={animationEnabled}
                  onCheckedChange={setAnimationEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Play Minecraft-style animations for textures that include a
                corresponding{' '}
                <span className="font-mono text-accent">.mcmeta</span> file.
              </p>
            </div>

            <p className="pt-1 text-xs text-muted-foreground/80">
              Changes are applied per browser and do not affect the underlying
              repositories.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-1 border-t border-border/60 pt-3">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              type="button"
              variant={hasChanges ? 'default' : 'secondary'}
              size="sm"
              className="font-bold"
              onClick={handleSave}>
              Apply settings
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
