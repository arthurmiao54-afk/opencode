// This method is called when your extension is deactivated
export function deactivate() {}

import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"

const TERMINAL_NAME = "cimicode"
const PORT_NAME = "_EXTENSION_CIMICODE_PORT"

export function activate(context: vscode.ExtensionContext) {
  let openNewTerminalDisposable = vscode.commands.registerCommand("cimicode.openNewTerminal", async () => {
    await openTerminal()
  })

  let openTerminalDisposable = vscode.commands.registerCommand("cimicode.openTerminal", async () => {
    // A cimicode terminal already exists => focus it
    const existingTerminal = vscode.window.terminals.find((t) => t.name === TERMINAL_NAME)
    if (existingTerminal) {
      existingTerminal.show()
      return
    }

    await openTerminal()
  })

  let addFilepathDisposable = vscode.commands.registerCommand("cimicode.addFilepathToTerminal", async () => {
    const fileRef = getActiveFile()
    if (!fileRef) {
      return
    }

    const terminal = vscode.window.activeTerminal
    if (!terminal) {
      return
    }

    if (terminal.name === TERMINAL_NAME) {
      // @ts-ignore
      const port = terminal.creationOptions.env?.[PORT_NAME]
      port ? await appendPrompt(parseInt(port), fileRef) : terminal.sendText(fileRef, false)
      terminal.show()
    }
  })

  context.subscriptions.push(openTerminalDisposable, addFilepathDisposable)

  async function openTerminal() {
    // Create a new terminal in split screen
    const bin = cmd()
    const port = Math.floor(Math.random() * (65535 - 16384 + 1)) + 16384
    const terminal = vscode.window.createTerminal({
      name: TERMINAL_NAME,
      iconPath: {
        light: vscode.Uri.file(context.asAbsolutePath("images/button-dark.svg")),
        dark: vscode.Uri.file(context.asAbsolutePath("images/button-light.svg")),
      },
      location: {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: false,
      },
      env: {
        [PORT_NAME]: port.toString(),
        OPENCODE_CALLER: "vscode",
        OPENCODE_BRAND: "cimicode",
      },
      shellArgs: bin ? ["--port", port.toString()] : undefined,
      shellPath: bin,
    })

    terminal.show()
    if (!bin) terminal.sendText(`cimicode --port ${port}`)

    const fileRef = getActiveFile()
    if (!fileRef) {
      return
    }

    // Wait for the terminal to be ready
    let tries = 10
    let connected = false
    do {
      await new Promise((resolve) => setTimeout(resolve, 200))
      try {
        await fetch(`http://localhost:${port}/app`)
        connected = true
        break
      } catch (e) {}

      tries--
    } while (tries > 0)

    // If connected, append the prompt to the terminal
    if (connected) {
      await appendPrompt(port, `In ${fileRef}`)
      terminal.show()
    }
  }

  async function appendPrompt(port: number, text: string) {
    await fetch(`http://localhost:${port}/tui/append-prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })
  }

  function getActiveFile() {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) {
      return
    }

    const document = activeEditor.document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
    if (!workspaceFolder) {
      return
    }

    // Get the relative path from workspace root
    const relativePath = vscode.workspace.asRelativePath(document.uri)
    let filepathWithAt = `@${relativePath}`

    // Check if there's a selection and add line numbers
    const selection = activeEditor.selection
    if (!selection.isEmpty) {
      // Convert to 1-based line numbers
      const startLine = selection.start.line + 1
      const endLine = selection.end.line + 1

      if (startLine === endLine) {
        // Single line selection
        filepathWithAt += `#L${startLine}`
      } else {
        // Multi-line selection
        filepathWithAt += `#L${startLine}-${endLine}`
      }
    }

    return filepathWithAt
  }

  function cmd() {
    const set = vscode.workspace.getConfiguration("cimicode").get<string>("path")?.trim()
    if (set) {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      const file = path.isAbsolute(set) || !root ? set : path.join(root, set)
      if (fs.existsSync(file)) return file
      void vscode.window.showWarningMessage(`Configured cimicode.path was not found: ${file}`)
    }

    const exe = process.platform === "win32" ? "cimicode.exe" : "cimicode"
    const os = process.platform === "win32" ? "windows" : process.platform
    const dir = `cimicode-${os}-${process.arch}`
    const list =
      vscode.workspace.workspaceFolders?.flatMap((item) => roots(item.uri.fsPath).map((root) => path.join(root, "packages", "opencode", "dist", dir, "bin", exe))) ?? []

    return list.find((item, index) => list.indexOf(item) === index && fs.existsSync(item))
  }

  function roots(input: string) {
    const list = [input]
    let dir = input
    while (list.length < 6) {
      const next = path.dirname(dir)
      if (next === dir) return list
      list.push(next)
      dir = next
    }
    return list
  }
}
