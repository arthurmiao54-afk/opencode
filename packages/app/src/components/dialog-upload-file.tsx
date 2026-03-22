import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { showToast } from "@opencode-ai/ui/toast"
import { createSignal, For, Show } from "solid-js"
import { useLanguage } from "@/context/language"
import { webFileTransferApi } from "@/utils/web-file-transfer"

interface FileUploadItem {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  message?: string
}

export function DialogUploadFile() {
  const language = useLanguage()
  const dialog = useDialog()

  const [files, setFiles] = createSignal<FileUploadItem[]>([])
  const [isDragging, setIsDragging] = createSignal(false)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: FileUploadItem[] = Array.from(selectedFiles).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      progress: 0,
      status: "pending" as const,
    }))

    setFiles((prev) => [...prev, ...newFiles])
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer?.files ?? null)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadFile = async (item: FileUploadItem) => {
    setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" as const } : f)))

    try {
      const result = await webFileTransferApi.uploadFile(item.file, "", (progress) => {
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress } : f)))
      })

      if (result.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "success" as const, progress: 100, message: result.message } : f,
          ),
        )
        showToast({
          variant: "success",
          icon: "circle-check",
          title: language.t("webFileTransfer.upload.success"),
        })
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "error" as const, message: result.message ?? "Upload failed" } : f,
          ),
        )
        showToast({
          variant: "error",
          title: language.t("webFileTransfer.upload.error"),
          description: result.message,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed"
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error" as const, message } : f)))
      showToast({
        variant: "error",
        title: language.t("webFileTransfer.upload.error"),
        description: message,
      })
    }
  }

  const uploadAll = async () => {
    const pendingFiles = files().filter((f) => f.status === "pending")
    for (const file of pendingFiles) {
      await uploadFile(file)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog title={language.t("webFileTransfer.upload.title")} transition>
      <div class="flex flex-col gap-3 px-5 pb-4">
        {/* Drop Zone */}
        <div
          classList={{
            "relative flex flex-col items-center justify-center py-5 border-2 border-dashed rounded-lg transition-colors cursor-pointer": true,
            "border-border-weaker-base hover:border-border-weak-base hover:bg-surface-raised-base": !isDragging(),
            "border-border-focus bg-surface-raised-base-active": isDragging(),
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById("upload-file-input")?.click()}
        >
          <input
            type="file"
            multiple
            class="hidden"
            id="upload-file-input"
            onChange={(e) => handleFileSelect(e.currentTarget.files)}
          />
          <div class="flex items-center gap-2">
            <Icon name="cloud-upload" class="text-icon-base" />
            <span class="text-14-regular text-text-base">
              {language.t("webFileTransfer.upload.dropzone")}
            </span>
          </div>
        </div>

        {/* File List */}
        <Show when={files().length > 0}>
          <div class="flex flex-col rounded-lg border border-border-weak-base overflow-hidden">
            <For each={files()}>
              {(item, index) => (
                <div
                  classList={{
                    "flex items-center gap-3 px-3 py-2": true,
                    "border-b border-border-weak-base": index() < files().length - 1,
                    "bg-surface-raised-base": item.status === "success",
                  }}
                >
                  <FileIcon node={{ path: item.file.name, type: "file" }} class="shrink-0 size-4" />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-14-regular text-text-strong truncate">{item.file.name}</span>
                      <Show when={item.status === "uploading"}>
                        <span class="text-12-regular text-text-weak shrink-0 tabular-nums">
                          {item.progress}%
                        </span>
                      </Show>
                      <Show when={item.status === "pending"}>
                        <span class="text-12-regular text-text-weak shrink-0">{formatSize(item.file.size)}</span>
                      </Show>
                      <Show when={item.status === "success"}>
                        <Icon name="circle-check" size="small" class="text-icon-success-base shrink-0" />
                      </Show>
                      <Show when={item.status === "error"}>
                        <Icon name="circle-x" size="small" class="text-icon-critical-base shrink-0" />
                      </Show>
                    </div>
                    <Show when={item.status === "uploading"}>
                      <div class="mt-1.5 h-1 bg-border-weak-base rounded-full overflow-hidden">
                        <div
                          class="h-full bg-icon-success-base transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </Show>
                    <Show when={item.message && item.status === "error"}>
                      <p class="mt-1 text-12-regular text-icon-critical-base truncate">{item.message}</p>
                    </Show>
                  </div>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <Show when={item.status === "pending" || item.status === "error"}>
                      <Button
                        variant="ghost"
                        size="small"
                        class="!size-6 !p-0"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation()
                          uploadFile(item)
                        }}
                      >
                        <Icon name="play" size="small" />
                      </Button>
                    </Show>
                    <Button
                      variant="ghost"
                      size="small"
                      class="!size-6 !p-0"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation()
                        removeFile(item.id)
                      }}
                    >
                      <Icon name="close" size="small" />
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Actions */}
        <Show when={files().filter((f) => f.status === "pending").length > 0}>
          <Button class="w-full" onClick={uploadAll}>
            <Icon name="cloud-upload" size="small" />
            {language.t("webFileTransfer.upload.uploadAll")}
          </Button>
        </Show>
      </div>
    </Dialog>
  )
}
