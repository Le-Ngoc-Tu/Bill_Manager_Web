import * as React from "react"
import { cn } from "@/lib/utils"

function FlatInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-8 sm:h-9 w-full min-w-0 rounded-none border-0 border-b bg-transparent px-2 sm:px-3 py-1 text-sm sm:text-base shadow-none transition-[color,border-color] outline-none file:inline-flex file:h-6 sm:file:h-7 file:border-0 file:bg-transparent file:text-xs sm:file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-blue-300 focus-visible:ring-0",
        "aria-invalid:border-red-300 dark:aria-invalid:border-red-300",
        className
      )}
      {...props}
    />
  )
}

export { FlatInput }
