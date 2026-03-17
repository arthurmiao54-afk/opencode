import { Match, Show, Switch, createMemo } from "solid-js"
import { createMediaQuery } from "@solid-primitives/media"
import { Tabs } from "@opencode-ai/ui/tabs"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"

import FileTree from "@/components/file-tree"
import { useFile } from "@/context/file"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useSync } from "@/context/sync"
import type { Sizing } from "@/pages/session/helpers"
import { useSessionLayout } from "@/pages/session/session-layout"

export function SessionSidePanel(props: {
  activeDiff?: string
  focusReviewDiff: (path: string) => void
  reviewSnap: boolean
  size: Sizing
}) {
  const layout = useLayout()
  const sync = useSync()
  const file = useFile()
  const language = useLanguage()
  const { params } = useSessionLayout()

  const isDesktop = createMediaQuery("(min-width: 768px)")

  const fileOpen = createMemo(() => isDesktop() && layout.fileTree.opened())

  const info = createMemo(() => (params.id ? sync.session.get(params.id) : undefined))
  const diffs = createMemo(() => (params.id ? (sync.data.session_diff[params.id] ?? []) : []))
  const reviewCount = createMemo(() => Math.max(info()?.summary?.files ?? 0, diffs().length))
  const hasReview = createMemo(() => reviewCount() > 0)
  const diffsReady = createMemo(() => {
    const id = params.id
    if (!id) return true
    if (!hasReview()) return true
    return sync.data.session_diff[id] !== undefined
  })

  const reviewEmptyKey = createMemo(() => {
    if (sync.project && !sync.project.vcs) return "session.review.noVcs"
    if (sync.data.config.snapshot === false) return "session.review.noSnapshot"
    return "session.review.noChanges"
  })

  const diffFiles = createMemo(() => diffs().map((d) => d.file))
  const kinds = createMemo(() => {
    const merge = (a: "add" | "del" | "mix" | undefined, b: "add" | "del" | "mix") => {
      if (!a) return b
      if (a === b) return a
      return "mix" as const
    }

    const normalize = (p: string) => p.replaceAll("\\\\", "/").replace(/\/+$/, "")

    const out = new Map<string, "add" | "del" | "mix">()
    for (const diff of diffs()) {
      const f = normalize(diff.file)
      const kind = diff.status === "added" ? "add" : diff.status === "deleted" ? "del" : "mix"

      out.set(f, kind)

      const parts = f.split("/")
      for (const [idx] of parts.slice(0, -1).entries()) {
        const dir = parts.slice(0, idx + 1).join("/")
        if (!dir) continue
        out.set(dir, merge(out.get(dir), kind))
      }
    }
    return out
  })

  const empty = (msg: string) => (
    <div class="h-full flex flex-col">
      <div class="h-6 shrink-0" aria-hidden />
      <div class="flex-1 pb-64 flex items-center justify-center text-center">
        <div class="text-12-regular text-text-weak">{msg}</div>
      </div>
    </div>
  )

  const nofiles = createMemo(() => {
    const state = file.tree.state("")
    if (!state?.loaded) return false
    return file.tree.children("").length === 0
  })

  const fileTreeTab = () => layout.fileTree.tab()

  const setFileTreeTabValue = (value: string) => {
    if (value !== "changes" && value !== "all") return
    layout.fileTree.setTab(value)
  }

  const treeWidth = createMemo(() => (fileOpen() ? `${layout.fileTree.width()}px` : "0px"))

  return (
    <Show when={isDesktop()}>
      <aside
        id="file-tree-panel"
        aria-label={language.t("session.panel.files")}
        aria-hidden={!fileOpen()}
        inert={!fileOpen()}
        class="relative min-w-0 h-full flex shrink-0 overflow-hidden bg-background-base"
        classList={{
          "pointer-events-none": !fileOpen(),
          "transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] motion-reduce:transition-none":
            !props.size.active(),
        }}
        style={{ width: treeWidth() }}
      >
        <div class="size-full flex border-r border-border-weaker-base">
          <div class="h-full w-full flex flex-col overflow-hidden group/filetree" data-scope="filetree">
            <Tabs
              variant="pill"
              value={fileTreeTab()}
              onChange={setFileTreeTabValue}
              class="h-full"
            >
              <Tabs.List>
                <Tabs.Trigger value="changes" class="flex-1" classes={{ button: "w-full" }}>
                  {reviewCount()}{" "}
                  {language.t(reviewCount() === 1 ? "session.review.change.one" : "session.review.change.other")}
                </Tabs.Trigger>
                <Tabs.Trigger value="all" class="flex-1" classes={{ button: "w-full" }}>
                  {language.t("session.files.all")}
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="changes" class="bg-background-stronger px-3 py-0">
                <Switch>
                  <Match when={hasReview()}>
                    <Show
                      when={diffsReady()}
                      fallback={
                        <div class="px-2 py-2 text-12-regular text-text-weak">
                          {language.t("common.loading")}
                          {language.t("common.loading.ellipsis")}
                        </div>
                      }
                    >
                      <FileTree
                        path=""
                        class="pt-3"
                        allowed={diffFiles()}
                        kinds={kinds()}
                        draggable={false}
                        active={props.activeDiff}
                        onFileClick={(node) => props.focusReviewDiff(node.path)}
                      />
                    </Show>
                  </Match>
                  <Match when={true}>
                    {empty(
                      language.t(sync.project && !sync.project.vcs ? "session.review.noChanges" : reviewEmptyKey()),
                    )}
                  </Match>
                </Switch>
              </Tabs.Content>
              <Tabs.Content value="all" class="bg-background-stronger px-3 py-0">
                <Switch>
                  <Match when={nofiles()}>{empty(language.t("session.files.empty"))}</Match>
                  <Match when={true}>
                    <FileTree
                      path=""
                      class="pt-3"
                      modified={diffFiles()}
                      kinds={kinds()}
                      onFileClick={(node) => file.load(node.path)}
                    />
                  </Match>
                </Switch>
              </Tabs.Content>
            </Tabs>
          </div>
          <Show when={fileOpen()}>
            <div onPointerDown={() => props.size.start()}>
              <ResizeHandle
                direction="horizontal"
                edge="end"
                size={layout.fileTree.width()}
                min={200}
                max={480}
                collapseThreshold={160}
                onResize={(width) => {
                  props.size.touch()
                  layout.fileTree.resize(width)
                }}
                onCollapse={layout.fileTree.close}
              />
            </div>
          </Show>
        </div>
      </aside>
    </Show>
  )
}
