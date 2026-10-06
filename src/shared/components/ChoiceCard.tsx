import {Check} from 'lucide-react'

import {cn} from '@/shared/utils'

interface ChoiceCardProps {
  /** Radios with the same name form one group */
  name: string
  value: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * A radio choice shown as a card. The radio input stays in the DOM for
 * keyboard and screen reader use but is not drawn; the chosen card is shown
 * by a thick border and a check badge, which read clearly in both themes
 * without relying on a color tint.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  disabled,
  className,
  children,
}: ChoiceCardProps) {
  return (
    <label
      className={cn(
        'group relative block min-w-0 cursor-pointer rounded-lg border-2 border-border bg-card p-3 pr-10 transition-colors',
        'hover:border-foreground/40',
        'has-checked:border-primary',
        'has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background',
        'has-disabled:cursor-not-allowed has-disabled:opacity-60',
        className,
      )}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-has-checked:opacity-100">
        <Check className="size-3.5" />
      </span>
      {children}
    </label>
  )
}
