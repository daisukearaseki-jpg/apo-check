"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MEMBER_OPTIONS } from "@/lib/appointment"

interface MemberComboboxProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function MemberCombobox({
  id,
  value,
  onChange,
  placeholder = "選択または入力",
}: MemberComboboxProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    const query = value.trim()
    if (!query) return MEMBER_OPTIONS
    return MEMBER_OPTIONS.filter((name) => name.includes(query))
  }, [value])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [open])

  function selectOption(name: string) {
    onChange(name)
    setOpen(false)
    inputRef.current?.blur()
  }

  function toggleList() {
    setOpen((prev) => !prev)
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 pr-9 text-base"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        onFocus={() => setOpen(false)}
      />

      <button
        type="button"
        aria-label="候補を表示"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={toggleList}
        className={cn(
          "absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors",
          "hover:bg-muted/80 active:bg-muted",
        )}
      >
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-md"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">候補がありません</li>
          ) : (
            options.map((name) => (
              <li key={name} role="option" aria-selected={value === name}>
                <button
                  type="button"
                  onClick={() => selectOption(name)}
                  className={cn(
                    "w-full px-3 py-2.5 text-left text-base active:bg-muted",
                    value === name ? "bg-muted font-medium text-foreground" : "text-foreground",
                  )}
                >
                  {name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
