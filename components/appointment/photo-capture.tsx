"use client"

import { useRef } from "react"
import { Camera, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { compressImage, photoPreviewUrl, type PhotoAttachment } from "@/lib/photo"

interface PhotoCaptureProps {
  value: PhotoAttachment | null
  onChange: (value: PhotoAttachment | null) => void
}

export function PhotoCapture({ value, onChange }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) return
    try {
      const compressed = await compressImage(file)
      onChange(compressed)
    } catch {
      toast.error("写真の処理に失敗しました")
      onChange(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          void handleFileChange(file)
          e.target.value = ""
        }}
      />

      {!value ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="h-12 w-full text-base"
        >
          <Camera className="size-5" />
          写真を撮る
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreviewUrl(value)}
              alt="撮影した写真のプレビュー"
              className="max-h-64 w-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-11 w-full text-base"
          >
            <RotateCcw className="size-4" />
            撮り直す
          </Button>
        </div>
      )}
    </div>
  )
}
