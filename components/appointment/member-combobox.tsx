"use client"

import { Input } from "@/components/ui/input"
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
  const listId = `${id}-options`

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 text-base"
        autoComplete="off"
      />
      <datalist id={listId}>
        {MEMBER_OPTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  )
}
