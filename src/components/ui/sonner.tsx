"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--font-size": "1.125rem",
          "--toast-width": "400px",
          "--toast-height": "auto",
          "--toast-padding": "16px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          title: "text-lg font-medium",
          description: "text-base mt-1",
          actionButton: "text-base",
          cancelButton: "text-base",
          closeButton: "text-base",
        }
      }}
      {...props}
      position="top-right"
      richColors
      closeButton
    />
  )
}

export { Toaster }
