import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Scorer Z - Sistema de Avaliação",
  description: "Scorer Z - Sistema para avaliação de equipes no torneio de robótica",
  generator: "v0.app",
  icons: {
    icon: "/Logo.scorer.png",
    shortcut: "/Logo.scorer.png",
    apple: "/Logo.scorer.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/Logo.scorer.png" type="image/png" />
      </head>
      <body className={`font-sans ${inter.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
