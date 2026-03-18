import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { List } from "@opencode-ai/ui/list"
import { showToast } from "@opencode-ai/ui/toast"
import { getFilename, getDirectory } from "@opencode-ai/util/path"
import { createMemo, createSignal, Show } from "solid-js"
import { useLanguage } from "@/context/language"
import { useGlobalSDK } from "@/context/global-sdk"
import { useGlobalSync } from "@/context/global-sync"
import { webFileTransferApi, triggerDownload } from "@/utils/web-file-transfer"

interface FileItem {
  path: string
  name: string
  type: "file" | "directory"
}

export function DialogDownloadFile() {
  const language = useLanguage()
  const dialog = useDialog()
  const globalSDK = useGlobalSDK()
  const globalSync = useGlobalSync()

  const [isDownloading, setIsDownloading] = createSignal(false)

  const homedir = createMemo(() => globalSync.data.path.home)
  const workspacePath = createMemo(() => globalSync.data.path.directory)

  const searchFiles = async (query: string): Promise<FileItem[]> => {
    const workspace = workspacePath()
    if (!workspace) return []

    try {
      // Search for files
      const fileResult = await globalSDK.client.find.files({
        directory: workspace,
        query,
        limit: 30,
      })

      const files = (fileResult.data ?? []).map((path) => ({
        path,
        name: getFilename(path),
        type: "file" as const,
      }))

      // Also search for directories
      const dirResult = await globalSDK.client.find.files({
        directory: workspace,
        query,
        type: "directory",
        limit: 20,
      })

      const dirs = (dirResult.data ?? []).map((path) => ({
        path,
        name: getFilename(path),
        type: "directory" as const,
      }))

      // Put directories first
      return [...dirs, ...files]
    } catch (error) {
      console.error("Failed to search files:", error)
      return []
    }
  }

  const handleDownload = async (item: FileItem | undefined) => {
    if (!item) return

    setIsDownloading(true)

    try {
      let result
      if (item.type === "directory") {
        result = await webFileTransferApi.downloadDirectory(item.path)
      } else {
        result = await webFileTransferApi.downloadFile(item.path)
      }

      if (result.success && result.data) {
        triggerDownload(result.data, result.filename ?? item.name)
        showToast({
          variant: "success",
          icon: "circle-check",
          title: language.t("webFileTransfer.download.success"),
        })
      } else {
        showToast({
          variant: "error",
          icon: "circle-x",
          title: language.t("webFileTransfer.download.error"),
          description: result.message,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed"
      showToast({
        variant: "error",
        icon: "circle-x",
        title: language.t("webFileTransfer.download.error"),
        description: message,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const displayPath = (path: string) => {
    const home = homedir()
    if (home && path.startsWith(home)) {
      return "~" + path.slice(home.length)
    }
    return path
  }

  return (
    <Dialog title={language.t("webFileTransfer.download.title")} class="!max-w-lg">
      <div class="flex flex-col gap-3">
        <List
          search={{
            placeholder: language.t("webFileTransfer.download.searchPlaceholder"),
            autofocus: true,
            hideIcon: false,
          }}
          emptyMessage={language.t("webFileTransfer.download.empty")}
          loadingMessage={language.t("common.loading")}
          items={searchFiles}
          key={(item) => item.path}
          filterKeys={["name", "path"]}
          onSelect={handleDownload}
        >
          {(item) => (
            <div class="w-full flex items-center justify-between rounded-md pr-2">
              <div class="flex items-center gap-x-3 grow min-w-0">
                <FileIcon node={{ path: item.path, type: item.type }} class="shrink-0 size-4" />
                <div class="flex items-center text-14-regular min-w-0">
                  <span class="text-text-weak whitespace-nowrap overflow-hidden overflow-ellipsis truncate min-w-0">
                    {displayPath(getDirectory(item.path))}
                  </span>
                  <span class="text-text-strong whitespace-nowrap">{item.name}</span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Show when={item.type === "directory"}>
                  <span class="text-11-regular text-text-weaker px-1.5 py-0.5 bg-surface-raised-base rounded border border-border-weak-base">
                    folder
                  </span>
                </Show>
                <Button
                  variant="ghost"
                  size="small"
                  class="!p-1 !size-6"
                  disabled={isDownloading()}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(item)
                  }}
                >
                  <Show when={isDownloading()} fallback={<Icon name="download" size="small" />}>
                    <Icon name="spinner" size="small" class="animate-spin" />
                  </Show>
                </Button>
              </div>
            </div>
          )}
        </List>

        {/* Footer */}
        <div class="flex items-center justify-end pt-2 border-t border-border-weak-base">
          <Button variant="ghost" onClick={() => dialog.close()}>
            {language.t("common.close")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
