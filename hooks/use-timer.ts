"use client"

import { useState, useEffect, useRef } from "react"

export function useTimer() {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLimit, setTimeLimit] = useState(0) // in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          // Countdown: decrease by 1 second
          const newSeconds = prev - 1
          // Stop when reaching 0
          if (newSeconds <= 0) {
            setIsRunning(false)
            setIsPaused(false)
            return 0
          }
          return newSeconds
        })
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
      const totalSeconds = initialMinutes * 60
      setSeconds(totalSeconds)
      setTimeLimit(totalSeconds)
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
    return timeLimit - seconds // Return elapsed time
  }

  const reset = () => {
    setSeconds(timeLimit)
    setIsRunning(false)
    setIsPaused(false)
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate remaining time
  const remainingSeconds = seconds
  const isOverTime = seconds <= 0 && timeLimit > 0

  return {
    seconds: remainingSeconds,
    isRunning,
    isPaused,
    timeLimit,
    isOverTime,
    start,
    pause,
    resume,
    stop,
    reset,
    formatTime: () => formatTime(remainingSeconds),
  }
}
