import { logger } from "#src/logger.js";

export interface PipelineContext {
  state: Record<string, unknown>;
  params: Record<string, unknown>;
}

export type StepHandler = (ctx: PipelineContext) => Promise<PipelineContext>;

export class PipelineStopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineStopError";
  }
}

interface Step {
  name: string;
  handler: StepHandler;
}

export class Pipeline {
  private steps: Step[] = [];

  step(name: string, handler: StepHandler): this {
    this.steps.push({ name, handler });
    return this;
  }

  async run(stepNames?: string[]): Promise<PipelineContext> {
    const log = logger.child({ module: "pipeline" });
    const startedAt = Date.now();

    const selected = stepNames ? this.steps.filter((s) => stepNames.includes(s.name)) : this.steps;

    const nameList = selected.map((s) => s.name).join(" → ");
    log.info(`Pipeline started (${nameList})`);

    let ctx: PipelineContext = { state: {}, params: {} };

    for (const step of selected) {
      const stepLog = logger.child({ module: "pipeline", step: step.name });
      const stepStartedAt = Date.now();

      stepLog.info("Step started");

      try {
        ctx = await step.handler(ctx);
        const took = Date.now() - stepStartedAt;
        stepLog.info(`Step completed (${took}ms)`);
      } catch (err) {
        if (err instanceof PipelineStopError) {
          const took = Date.now() - stepStartedAt;
          stepLog.info(`Step stopped (${took}ms): ${err.message}`);
          return ctx;
        }
        const took = Date.now() - stepStartedAt;
        stepLog.error(err as Error, `Step failed (${took}ms)`);
        throw err;
      }
    }

    const took = Date.now() - startedAt;
    log.info(`Pipeline completed (${took}ms)`);
    return ctx;
  }
}
