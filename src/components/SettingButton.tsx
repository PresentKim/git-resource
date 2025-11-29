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
          className="rounded-full">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your experience</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-8 py-4">
          <div data-slot="github-token-input" className="flex flex-col gap-2">
            <Label
              htmlFor="githubToken"
              className="flex items-center gap-2 text-base">
              GitHub Token
              <a
                href="https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#primary-rate-limit-for-unauthenticated-users"
                target="_blank"
                rel="noreferrer">
                <Info className="h-4 w-4 text-accent cursor-help" />
              </a>
              {rateLimit.limit ? (
                <div className="flex-1 text-end text-sm text-accent">
                  ({rateLimit.remaining || '-'} / {rateLimit.limit || '-'})
                </div>
              ) : null}
            </Label>
            <Input
              id="githubToken"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              placeholder="github_pat_1234567890"
              className="text-sm"
            />
            <div className="text-sm text-accent">
              Required for access private repositories
            </div>
          </div>
          <hr />
          <div data-slot="column-count-slider" className="flex flex-col gap-2">
            <Label className="flex justify-between text-base">
              Columns in Grid
              <span className="text-sm text-accent">
                {columnCount ? `${columnCount} columns` : 'auto'}
              </span>
            </Label>
            <Slider
              id="columnCount"
              min={0}
              max={20}
              step={1}
              value={[columnCount]}
              onValueChange={value => setColumnCount(value[0])}
            />

            <p className="text-sm text-accent">
              0 is automatically based on screen width
            </p>
          </div>
          <hr />
          <div data-slot="pixelated-toggle" className="flex flex-col gap-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="pixelated" className="text-base">
                Pixelated Images
              </Label>
              <Switch
                id="pixelated"
                checked={pixelated}
                onCheckedChange={setPixelated}
              />
            </div>
            <p className="text-sm text-accent">
              Render with distinct pixels for a pixel-art
            </p>
          </div>
          <hr />
          <div data-slot="animation-toggle" className="flex flex-col gap-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="animationEnabled" className="text-base">
                Animate .mcmeta Textures
              </Label>
              <Switch
                id="animationEnabled"
                checked={animationEnabled}
                onCheckedChange={setAnimationEnabled}
              />
            </div>
            <p className="text-sm text-accent">
              Play animations for textures with .mcmeta files (Minecraft)
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button" onClick={handleSave}>
              Apply Settings
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
