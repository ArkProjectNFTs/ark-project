import clsx from 'clsx'
import Link from 'next/link'

function ArrowIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.5 6.5 3 3.5m0 0-3 3.5m3-3.5h-9"
      />
    </svg>
  )
}

const variantStyles = {
  primary:
    'flex items-center rounded-full text-white hover:text-white bg-folly-red-base dark:text-galaxy-blue hover:bg-folly-red-400 no-underline',
  outline:
    'flex items-center rounded-full ring-2 text-space-blue-900 ring-space-blue-900 hover:ring-space-blue-700 hover:text-space-blue-700 dark:bg-transparent dark:text-space-blue-400 dark:ring-inset dark:ring-space-blue-400 no-underline dark:hover:text-space-blue-200 dark:hover:ring-space-blue-200',
  text: 'text-space-blue-500 hover:text-space-blue-600 dark:text-space-blue-400 dark:hover:text-space-blue-500',
  filled:
    'flex items-center rounded-full bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400',
}

const sizeStyles = {
  default: 'h-12 px-6',
  sm: 'h-8 px-3',
  auto: 'h-auto',
}

type ButtonType = 'button' | 'submit' | 'reset'

type ButtonProps = {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  arrow?: 'left' | 'right'
  isExternal?: boolean
  className?: string
  href?: string
  onClick?: () => void
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size,
  className,
  children,
  arrow,
  isExternal,
  href,
  onClick,
}: ButtonProps) {
  className = clsx(
    'inline-flex gap-0.5 justify-center overflow-hidden text-sm font-medium transition',
    variantStyles[variant],
    size !== undefined
      ? sizeStyles[size]
      : sizeStyles[variant === 'text' ? 'auto' : 'default'],
    className,
  )

  let arrowIcon = (
    <ArrowIcon
      className={clsx(
        'mt-0.5 h-5 w-5',
        variant === 'text' && 'relative top-px',
        arrow === 'left' && '-ml-1 rotate-180',
        arrow === 'right' && '-mr-1',
      )}
    />
  )

  let inner = (
    <>
      {arrow === 'left' && arrowIcon}
      {children}
      {arrow === 'right' && arrowIcon}
    </>
  )

  if (href) {
    return (
      <Link
        target={isExternal ? '_blank' : '_self'}
        className={className}
        href={href}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button className={className} onClick={onClick}>
      {inner}
    </button>
  )
}
