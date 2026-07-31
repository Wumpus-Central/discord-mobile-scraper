import type { Logger } from "pino";

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export class ProgressTracker {
  private bytes = 0;
  private interval: ReturnType<typeof setInterval>;
  private startTime = Date.now();

  constructor(
    private totalSize: number,
    private label: string,
    private logger: Logger,
  ) {
    this.interval = setInterval(() => this.report(), 2500);
  }

  add(bytes: number): void {
    this.bytes += bytes;
  }

  sizeLabel(): string {
    return this.totalSize > 0 ? `${formatMB(this.totalSize)} MB` : "unknown";
  }

  summary(): { size: string; took: string } {
    const took = ((Date.now() - this.startTime) / 1000).toFixed(1);
    return {
      size: `${formatMB(this.bytes)} MB`,
      took: `${took}s`,
    };
  }

  private report(): void {
    if (this.totalSize > 0) {
      const pct = ((this.bytes / this.totalSize) * 100).toFixed(1);
      this.logger.info({ pct: `${pct}%`, mb: `${formatMB(this.bytes)} MB` }, `Downloading ${this.label}`);
    } else {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);
      this.logger.info(
        { downloaded: `${formatMB(this.bytes)} MB`, elapsed: `${elapsed}s` },
        `Downloading ${this.label}`,
      );
    }
  }

  done(): void {
    clearInterval(this.interval);
  }
}
