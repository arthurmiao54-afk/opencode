import type { Plugin } from "@opencode-ai/plugin"
import { LangfuseSpanProcessor } from "@langfuse/otel"
import { NodeSDK } from "@opentelemetry/sdk-node"

// 支持两种配置方式
const HARDCODED_CONFIG = {
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",  // 环境变量优先
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com",
  environment: process.env.LANGFUSE_ENVIRONMENT || "development",
}

// 如果需要硬编码配置，取消下面的注释并填入实际值
// const HARDCODED_CONFIG = {
//   publicKey: "pk-lf-your-public-key",
//   secretKey: "sk-lf-your-secret-key",
//   baseUrl: "https://cloud.langfuse.com",
//   environment: "production",
// }

export const LangfusePlugin: Plugin = async ({ client }) => {
  const publicKey = HARDCODED_CONFIG.publicKey
  const secretKey = HARDCODED_CONFIG.secretKey
  const baseUrl = HARDCODED_CONFIG.baseUrl
  const environment = HARDCODED_CONFIG.environment

  const log = (level: "info" | "warn" | "error", message: string) => {
    client.app.log({
      body: { service: "langfuse-otel", level, message },
    })
  }

  if (!publicKey || !secretKey) {
    log("warn", "Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY - tracing disabled")
    return {}
  }

  const processor = new LangfuseSpanProcessor({
    publicKey,
    secretKey,
    baseUrl,
    environment,
  })

  const sdk = new NodeSDK({
    spanProcessors: [processor],
  })

  sdk.start()
  log("info", `OTEL tracing initialized → ${baseUrl}`)

  return {
    config: async (config) => {
      if (!config.experimental?.openTelemetry) {
        log("warn", "OpenTelemetry experimental feature is disabled in Opencode config - tracing disabled")
      }
    },
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        log("info", "Flushing OTEL spans before idle")
        await processor.forceFlush()
      }
      if (event.type === "server.instance.disposed") {
        await sdk.shutdown()
      }
    },
  }
}