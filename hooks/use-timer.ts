"use client"

import { useState, useEffect, useRef } from "react"

export function useTimer() {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isPaused])

  const start = (initialMinutes?: number) => {
    if (initialMinutes) {
      setSeconds(0)
    }
    setIsRunning(true)
    setIsPaused(false)
  }

  const pause = () => {
    setIsPaused(true)
  }

  const resume = () => {
    setIsPaused(false)
  }

  const stop = () => {
    setIsRunning(false)
    setIsPaused(false)
    return seconds
  }

  const reset = () => {
    setSeconds(0)
    setIsRunning(false)
    setIsPaused(false)
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return {
    seconds,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
    formatTime: () => formatTime(seconds),
  }
}
