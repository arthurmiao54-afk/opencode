declare global {
  const OPENCODE_BRAND: string | undefined
}

function clean(input: string) {
  const value = input.trim().toLowerCase()
  return value || "opencode"
}

function title(input: string) {
  return input
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("")
}

function display(input: string) {
  if (input === "opencode") return "OpenCode"
  if (input.endsWith("code") && input !== "opencode") return `${title(input.slice(0, -4))} Code`
  return title(input)
}

const id = clean(typeof OPENCODE_BRAND === "string" ? OPENCODE_BRAND : process.env.OPENCODE_BRAND ?? "opencode")
const name = id === "opencode" ? "OpenCode" : title(id)
const spaced = display(id)
const tag = (id.replace(/[^a-z0-9]/g, "").slice(0, 2) || name.slice(0, 2)).toUpperCase()

export const Brand = {
  id,
  name,
  spaced,
  tag,
  cmd(input?: string) {
    return input ? `${id} ${input}` : id
  },
  provider(providerID: string, input?: string) {
    const known = {
      opencode: `${spaced} Zen`,
      "opencode-go": `${spaced} Go`,
    }[providerID]
    if (!known) return input ?? providerID
    if (!input) return known
    const defaults = {
      opencode: ["opencode", "OpenCode", "Open Code", "OpenCode Zen", "Open Code Zen"],
      "opencode-go": ["opencode-go", "OpenCode Go", "Open Code Go"],
    }[providerID]
    return defaults?.includes(input) ? known : input
  },
}
