"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Trophy, Award, Target, Star, Flame, Zap, Rocket, Crown,
  Shield, Sword, Medal, Gem, Heart, Flag, Gamepad2, Chess,
  Bot, Cpu, Code, Database, Network, Brain, Lightbulb,
  Sparkles, Sun, Moon, Rainbow, Palette, Music, Book,
  GraduationCap, School, Users, Team, UserCircle, UserCheck
} from "lucide-react"

interface IconSelectorProps {
  value?: string
  onChange: (iconName: string) => void
}

// Lista de ícones disponíveis com suas categorias
const ICON_CATEGORIES: Record<string, Record<string, React.ComponentType<any>>> = {
  "Esportes e Competição": {
    Trophy, Award, Target, Star, Medal, Crown, Flag, Chess
  },
  "Tecnologia": {
    Bot, Cpu, Code, Database, Network, Brain, Gamepad2
  },
  "Criatividade": {
    Lightbulb, Sparkles, Sun, Moon, Rainbow, Palette, Music, Book
  },
  "Educação": {
    GraduationCap, School, Users, Team, UserCircle, UserCheck
  },
  "Diversos": {
    Flame, Zap, Rocket, Heart, Gem
  }
}

// Flatten all icons with their names
const allIcons: Record<string, React.ComponentType<any>> = {}
Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
  Object.entries(icons).forEach(([name, Icon]) => {
    allIcons[name] = Icon
  })
})

export function IconSelector({ value, onChange }: IconSelectorProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredIcons = Object.entries(allIcons).filter(([name]) => {
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || Object.keys(ICON_CATEGORIES[selectedCategory]).includes(name)
    return matchesSearch && matchesCategory
  })

  const IconComponent = value ? allIcons[value] : null

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-sm">Ícone do Torneio (opcional)</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5A5A5A]" />
          <Input
            placeholder="Buscar ícone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Filtros por categoria */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
            !selectedCategory
              ? "bg-[#009DE0] text-white"
              : "bg-[#F7F9FB] text-[#5A5A5A] hover:bg-[#E6E6E6]"
          }`}
        >
          Todos
        </button>
        {Object.keys(ICON_CATEGORIES).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === category
                ? "bg-[#009DE0] text-white"
                : "bg-[#F7F9FB] text-[#5A5A5A] hover:bg-[#E6E6E6]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Grid de ícones */}
      <div className="grid grid-cols-10 gap-1.5 max-h-48 overflow-y-auto p-2 border border-[#E6E6E6] rounded-lg">
        {filteredIcons.map(([name, IconComp]) => {
          const isSelected = value === name
          if (!IconComp) return null
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`p-1.5 rounded-md border transition-all ${
                isSelected
                  ? "border-[#009DE0] bg-[#009DE0]/10"
                  : "border-[#E6E6E6] hover:border-[#009DE0]/50 hover:bg-[#F7F9FB]"
              }`}
              title={name}
            >
              <IconComp
                className={`h-4 w-4 ${
                  isSelected ? "text-[#009DE0]" : "text-[#5A5A5A]"
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* Ícone selecionado preview */}
      {value && IconComponent && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#F7F9FB] rounded-lg">
          <span className="text-xs text-[#5A5A5A]">Ícone selecionado:</span>
          <IconComponent className="h-4 w-4 text-[#009DE0]" />
          <span className="text-xs font-medium text-[#0C2340]">{value}</span>
        </div>
      )}
    </div>
  )
}

