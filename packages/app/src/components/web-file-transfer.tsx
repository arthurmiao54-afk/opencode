import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { createMemo, createSignal, onMount, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { useLanguage } from "@/context/language"
import { usePlatform } from "@/context/platform"
import { DialogUploadFile } from "./dialog-upload-file"
import { DialogDownloadFile } from "./dialog-download-file"

/**
 * WebFileTransfer component
 *
 * Provides upload and download functionality for the web version.
 * This component is only rendered on web platform, not on desktop.
 */
export function WebFileTransfer() {
  const language = useLanguage()
  const platform = usePlatform()
  const dialog = useDialog()

  // Only show on web platform
  const isWeb = () => platform.platform === "web"

  // Create a reactive signal for the mount point
  const [mounted, setMounted] = createSignal(false)

  onMount(() => {
    // Wait for the DOM to be ready
    setMounted(true)
  })

  // Create a memo for the mount point to ensure it exists before rendering
  const rightMount = createMemo(() => {
    if (!mounted()) return null
    return document.getElementById("opencode-titlebar-right")
  })

  const handleUpload = () => {
    dialog.show(() => <DialogUploadFile />)
  }

  const handleDownload = () => {
    dialog.show(() => <DialogDownloadFile />)
  }

  return (
    <Show when={isWeb() && rightMount()}>
      {(mount) => (
        <Portal mount={mount()}>
          <div class="flex items-center gap-1 shrink-0">
            <Tooltip
              placement="bottom"
              value={language.t("webFileTransfer.upload.tooltip", {}, "Upload files to workspace")}
            >
              <Button
                variant="ghost"
                class="titlebar-icon w-8 h-6 p-0 box-border shrink-0"
                onClick={handleUpload}
                aria-label={language.t("webFileTransfer.upload.tooltip", {}, "Upload files to workspace")}
              >
                <Icon size="small" name="cloud-upload" />
              </Button>
            </Tooltip>
            <Tooltip
              placement="bottom"
              value={language.t("webFileTransfer.download.tooltip", {}, "Download files from workspace")}
            >
              <Button
                variant="ghost"
                class="titlebar-icon w-8 h-6 p-0 box-border shrink-0"
                onClick={handleDownload}
                aria-label={language.t("webFileTransfer.download.tooltip", {}, "Download files from workspace")}
              >
                <Icon size="small" name="download" />
              </Button>
            </Tooltip>
          </div>
        </Portal>
      )}
    </Show>
  )
}
