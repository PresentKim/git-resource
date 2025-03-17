import {useCallback, useState} from 'react'
import {useForm} from 'react-hook-form'

import {EraserIcon, SquareAsteriskIcon, SquareIcon} from 'lucide-react'
import {
  Form,
  FormItem,
  FormControl,
  FormField,
  FormLabel,
  FormDescription,
} from '@/components/ui/form'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'

import {useSettingStore} from '@/stores/settingStore'

type FormValues = {
  input: string
}

export default function Settings() {
  const {githubToken, setGithubToken} = useSettingStore()
  const [inputVisible, setInputVisible] = useState(false)

  const form = useForm<FormValues>({
    defaultValues: {
      input: '',
    },
  })

  const onSubmit = useCallback(
    ({input}: FormValues) => {
      setGithubToken(input.trim())

      form.setValue('input', '')
    },
    [form, setGithubToken],
  )

  const toggleInputVisible = useCallback(() => {
    setInputVisible(!inputVisible)
  }, [inputVisible])

  const onClockResetButton = useCallback(() => {
    setGithubToken('')
    form.setValue('input', '')
    form.setFocus('input')
  }, [setGithubToken, form])

  const onInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Prevent useless empty chars at start and end
      e.target.value = e.target.value.trim()

      // Remove the error message when the user starts typing
      form.clearErrors('input')
    },
    [form],
  )

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="input"
            render={({field}) => (
              <FormItem>
                <FormLabel className="text-xl font-bold" htmlFor="input">
                  Enter your GitHub Token
                </FormLabel>

                <div className="flex gap-1">
                  <FormControl
                    className="flex-1"
                    defaultValue={githubToken ?? ''}>
                    <Input
                      id="input"
                      aria-label="Github Token input"
                      type={inputVisible ? 'text' : 'password'}
                      className="transition-all text-xs md:text-sm"
                      placeholder="github_pat_0123456789asdfghjkl..."
                      {...field}
                      onInput={onInput}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    aria-label="Reset input"
                    variant="ghost"
                    className="!px-2"
                    onClick={onClockResetButton}>
                    <EraserIcon className="size-6" />
                  </Button>
                  <Button
                    type="button"
                    aria-label={inputVisible ? 'Hide input' : 'Show input'}
                    variant="ghost"
                    className="!px-2"
                    onClick={toggleInputVisible}>
                    {inputVisible ? (
                      <SquareIcon className="size-6" />
                    ) : (
                      <SquareAsteriskIcon className="size-6" />
                    )}
                  </Button>
                </div>
                <FormDescription>
                  Required for{' '}
                  <a
                    href="https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#primary-rate-limit-for-unauthenticated-users"
                    target="_blank"
                    rel="noreferrer"
                    className="underline">
                    rate limit for the GitHub API
                  </a>
                </FormDescription>
                <Button variant="secondary" type="submit">
                  Save
                </Button>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </>
  )
}
