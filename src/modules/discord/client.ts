import { logger } from "#src/logger.js";
import type { WebhookPayload } from "./types.js";

const log = logger.child({ module: "discord" });

export async function executeWebhook(payload: WebhookPayload): Promise<void> {
  const webhookUrl = process.env["WEBHOOK_DISCORD_UNI"];
  if (!webhookUrl) {
    throw new Error("WEBHOOK_DISCORD_UNI is not set");
  }

  log.info("Sending Discord webhook");

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    log.error({ status: res.status, body }, "Discord webhook error");
    throw new Error(`Discord webhook error: ${res.status} ${res.statusText}`);
  }

  log.info("Webhook sent");
}
