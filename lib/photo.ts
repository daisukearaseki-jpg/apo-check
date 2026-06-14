export interface PhotoAttachment {
  data: string
  contentType: string
  filename: string
}

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82

export function compressImage(file: File): Promise<PhotoAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("画像の処理に失敗しました"))
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("画像の処理に失敗しました"))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
        const data = dataUrl.split(",")[1] ?? ""
        resolve({
          data,
          contentType: "image/jpeg",
          filename: `apo-photo-${Date.now()}.jpg`,
        })
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function photoPreviewUrl(photo: PhotoAttachment): string {
  return `data:${photo.contentType};base64,${photo.data}`
}
