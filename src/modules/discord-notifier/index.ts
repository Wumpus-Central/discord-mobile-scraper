import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import type { ParsedVersion } from "#src/utils/discord-version.js";
import { EmbedBuilder, executeWebhook } from "#src/modules/discord/index.js";

const log = logger.child({ module: "discord-notifier" });

interface Stats {
  modules: number;
  source: number;
  runtime: number;
  hermesVersion: string;
  bundleSize: number;
}

interface ExperimentsCount {
  old: number;
  apex: number;
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const discordNotifier: StepHandler = async (ctx) => {
  const version = ctx.state["version"] as ParsedVersion | undefined;
  const stats = ctx.state["stats"] as Stats | undefined;
  const sourceCommit = ctx.state["sourceCommit"] as string | null | undefined;
  const experimentsCount = ctx.state["experimentsCount"] as ExperimentsCount | undefined;

  if (!version || !stats || !sourceCommit) {
    log.info("Skipping notification — missing version, stats or commit");
    return ctx;
  }

  const embed = new EmbedBuilder()
    .title(`Alpha - ${version.major}.${version.minor}`)
    .url(`https://github.com/Wumpus-Central/discord-mobile-datamining/commit/${sourceCommit}`)
    .color(5793266)
    .addField("Modules", `**${stats.modules}**`, true)
    .addField("Source files", String(stats.source), true)
    .addField("Runtime files", String(stats.runtime), true)
    .addField("Hermes", `HBC **v${stats.hermesVersion}**`, true)
    .addField("Bundle size", formatMB(stats.bundleSize), true);

  if (experimentsCount) {
    embed.addField("Experiments", `**${experimentsCount.apex}** apex · **${experimentsCount.old}** legacy`, true);
  }

  await executeWebhook({ embeds: [embed.build()] });

  log.info("Update notification sent to Discord");

  return ctx;
};
