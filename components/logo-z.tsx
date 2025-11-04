import Image from "next/image"

interface LogoZProps {
  width?: number
  height?: number
  className?: string
}

export function LogoZ({ width = 64, height = 64, className = "" }: LogoZProps) {
  return (
    <Image
      src="/Logo.scorer.png"
      alt="Scorer Z Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  )
}

