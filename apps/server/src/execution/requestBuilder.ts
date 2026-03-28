/**
 * Pacifica REST API request builder.
 *
 * Constructs signed HTTP requests with builder code injection for order attribution.
 */

import { signRequest, getApiKey } from "./signer.js";
import { config } from "../config.js";
import type { ExecutionError } from "@argus/shared";

export interface PacificaRequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  instruction: string;
  body?: Record<string, unknown>;
  queryParams?: Record<string, string>;
}

export interface PacificaSignedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Build a fully signed request for the Pacifica REST API.
 * Automatically injects the builder code for Argus attribution.
 */
export async function buildSignedRequest(
  options: PacificaRequestOptions
): Promise<PacificaSignedRequest> {
  const timestamp = Date.now();
  const window = config.requestWindowMs;

  // Flatten params for signing (body or query params)
  const signingParams: Record<string, string | number | boolean> = {};

  if (options.body) {
    for (const [k, v] of Object.entries(options.body)) {
      if (v !== undefined && v !== null) {
        signingParams[k] = String(v);
      }
    }
  }

  if (options.queryParams) {
    for (const [k, v] of Object.entries(options.queryParams)) {
      signingParams[k] = v;
    }
  }

  // Sign the request
  const signature = await signRequest(
    options.instruction,
    signingParams,
    timestamp,
    window
  );

  // Build URL
  let url = `${config.pacificaRestUrl}${options.path}`;
  if (options.queryParams && Object.keys(options.queryParams).length > 0) {
    const qs = new URLSearchParams(options.queryParams).toString();
    url += `?${qs}`;
  }

  // Build headers — always inject builder code
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "X-API-Key": await getApiKey(),
    "X-Timestamp": String(timestamp),
    "X-Window": String(window),
    "X-Signature": signature,
  };

  // Inject builder code for order attribution
  if (config.builderCode) {
    headers["X-Broker-Id"] = config.builderCode;
  }

  const result: PacificaSignedRequest = {
    url,
    method: options.method,
    headers,
  };

  if (options.body) {
    result.body = JSON.stringify(options.body);
  }

  return result;
}

/**
 * Execute a signed request against the Pacifica REST API with timeout.
 */
export async function sendSignedRequest(
  options: PacificaRequestOptions
): Promise<{ status: number; data: unknown }> {
  const req = await buildSignedRequest(options);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.requestTimeoutMs
  );

  try {
    const response = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      const error: ExecutionError = {
        code: "TIMEOUT",
        message: `Request timed out after ${config.requestTimeoutMs}ms`,
      };
      throw error;
    }

    const error: ExecutionError = {
      code: "NETWORK_ERROR",
      message: err instanceof Error ? err.message : "Network request failed",
    };
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
