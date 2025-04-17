import * as React from "react"

// Define breakpoints for different device sizes
const BREAKPOINTS = {
  mobile: 640,  // Small mobile devices
  tablet: 768,  // Tablets and large mobile devices
  laptop: 1024, // Laptops and small desktops
  desktop: 1280 // Large desktops
}

// Original mobile hook for backward compatibility
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.tablet - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < BREAKPOINTS.tablet)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// Device type enum
export type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop'

// Enhanced hook that returns the current device type
export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<DeviceType>('desktop')

  React.useEffect(() => {
    const determineDeviceType = () => {
      const width = window.innerWidth
      if (width < BREAKPOINTS.mobile) {
        setDeviceType('mobile')
      } else if (width < BREAKPOINTS.tablet) {
        setDeviceType('mobile') // Larger mobile
      } else if (width < BREAKPOINTS.laptop) {
        setDeviceType('tablet')
      } else if (width < BREAKPOINTS.desktop) {
        setDeviceType('laptop')
      } else {
        setDeviceType('desktop')
      }
    }

    // Set initial device type
    determineDeviceType()

    // Add event listener for window resize
    window.addEventListener('resize', determineDeviceType)

    // Cleanup
    return () => window.removeEventListener('resize', determineDeviceType)
  }, [])

  return deviceType
}

// Hook to check if screen is smaller than a specific breakpoint
export function useIsBreakpoint(breakpoint: keyof typeof BREAKPOINTS) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`)
    const onChange = () => {
      setIsBelow(window.innerWidth < BREAKPOINTS[breakpoint])
    }
    mql.addEventListener("change", onChange)
    setIsBelow(window.innerWidth < BREAKPOINTS[breakpoint])
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return !!isBelow
}
