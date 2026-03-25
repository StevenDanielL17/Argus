import type { SignalEvent } from "@argus/shared";
import { broadcast } from "../ws/clientHub.js";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "..", "..", "logs");
const LOG_FILE = join(LOG_DIR, "signals.log");

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

const recentSignals: SignalEvent[] = [];
const MAX_SIGNALS = 50;

export function emitSignal(event: SignalEvent): void {
  // Store in rolling buffer
  recentSignals.unshift(event);
  if (recentSignals.length > MAX_SIGNALS) {
    recentSignals.pop();
  }

  // Broadcast to all connected frontend clients
  broadcast({ type: "signal_event", event });

  // Log to file for post-mortem debugging
  try {
    appendFileSync(LOG_FILE, JSON.stringify({ ...event, logged_at: Date.now() }) + "\n");
  } catch {
    // Silently ignore log write failures
  }

  console.log(`[SignalBus] ${event.severity.toUpperCase()} ${event.type}: ${event.message}`);
}

export function getRecentSignals(): SignalEvent[] {
  return [...recentSignals];
}
