import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-[#009DE0] selection:text-white dark:bg-input/30 border-2 border-[#E6E6E6] flex h-10 w-full min-w-0 rounded-lg bg-transparent px-4 py-2 text-base shadow-sm transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-[#009DE0] focus-visible:ring-[#009DE0]/20 focus-visible:ring-[3px]',
        'aria-invalid:ring-[#E64A19]/20 dark:aria-invalid:ring-[#E64A19]/40 aria-invalid:border-[#E64A19]',
        'hover:border-[#009DE0]/50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
