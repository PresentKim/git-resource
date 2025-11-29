import {Settings as SettingsIcon, Info} from 'lucide-react'
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

import {useSettingStore} from '@/stores/settingStore'
import {useGithubRateLimitStore} from '@/stores/githubApiStore'
import {useState} from 'react'

export function SettingButton() {
  const settings = useSettingStore()
  const rateLimit = useGithubRateLimitStore()
  const [githubToken, setGithubToken] = useState('')
  const [columnCount, setColumnCount] = useState(0)
  const [pixelated, setPixelated] = useState(true)
  const [animationEnabled, setAnimationEnabled] = useState(true)

  const handleSave = () => {
    settings.setGithubToken(githubToken)
    settings.setColumnCount(columnCount)
    settings.setPixelated(pixelated)
    settings.setAnimationEnabled(animationEnabled)
  }

  const handleOpenChange = (open: boolean) => {
    // Reset the values if the dialog is opened
    if (open) {
      setGithubToken(settings.githubToken)
      setColumnCount(settings.columnCount)
      setPixelated(settings.pixelated)
      setAnimationEnabled(settings.animationEnabled)
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
      <DialogContent className="max-h-[100vh-2rem] w-[min(100vw-1.5rem,40rem)] overflow-y-auto border-border/70 bg-card shadow-xl shadow-black/40 sm:max-w-2xl">
        <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold">
            <span>Viewer settings</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tune how images are loaded and rendered. These settings are stored in your browser only.
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
                  <div className="text-[0.65rem] text-accent">
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
              <p className="text-[0.7rem] text-muted-foreground">
                Used to increase GitHub API rate limits and access private repositories.
              </p>
            </div>

            <div
              data-slot="column-count-slider"
              className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-[0.14em] text-foreground">
                  Columns in grid
                </Label>
                <span className="text-[0.7rem] text-accent">
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
              <p className="text-[0.7rem] text-muted-foreground">
                Set to <span className="font-mono text-accent">0</span> to automatically fit the screen width.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border/60 bg-background/40 p-3">
            <div data-slot="pixelated-toggle" className="space-y-1.5">
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
              <p className="text-[0.7rem] text-muted-foreground">
                Render images with crisp pixels, ideal for pixel-art textures.
              </p>
            </div>

            <div
              data-slot="animation-toggle"
              className="space-y-1.5 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="animationEnabled" className="text-sm font-medium">
                  Animate .mcmeta textures
                </Label>
                <Switch
                  id="animationEnabled"
                  checked={animationEnabled}
                  onCheckedChange={setAnimationEnabled}
                />
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                Play Minecraft-style animations for textures that include a
                corresponding <span className="font-mono text-accent">.mcmeta</span> file.
              </p>
            </div>

            <p className="pt-1 text-[0.65rem] text-muted-foreground/80">
              Changes are applied per browser and do not affect the underlying repositories.
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
            <Button type="button" size="sm" className="font-bold" onClick={handleSave}>
              Apply settings
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
