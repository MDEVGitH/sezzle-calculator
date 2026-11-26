import type { Operation } from '../domain/operations';

export interface CalculationResult {
  operation: Operation;
  operands: number[];
  result: number;
}

/** Error raised for any failed calculation, with a stable machine-readable code. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type CalculateFn = (operation: Operation, operands: number[]) => Promise<CalculationResult>;

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** Creates a calculate function bound to a base URL and fetch implementation. */
export function createCalculatorClient(baseUrl = API_BASE, fetchImpl: typeof fetch = fetch): CalculateFn {
  return async (operation, operands) => {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/api/v1/operations/${encodeURIComponent(operation)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operands }),
      });
    } catch {
      throw new ApiError('NETWORK_ERROR', 'Unable to reach the calculator service. Please try again.');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('INVALID_RESPONSE', 'The server returned an unexpected response.', response.status);
    }

    if (!response.ok) {
      const err = (body as { error?: { code?: string; message?: string } })?.error;
      throw new ApiError(
        err?.code ?? 'UNKNOWN_ERROR',
        err?.message ?? `Request failed with status ${response.status}`,
        response.status,
      );
    }

    const result = body as CalculationResult;
    if (typeof result?.result !== 'number') {
      throw new ApiError('INVALID_RESPONSE', 'The server returned an unexpected response.', response.status);
    }
    return result;
  };
}

export const calculate: CalculateFn = (operation, operands) =>
  createCalculatorClient()(operation, operands);
