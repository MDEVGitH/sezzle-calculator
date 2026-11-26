import { useCallback, useRef, useState } from 'react';
import { ApiError, calculate as defaultCalculate, type CalculateFn } from '../api/calculatorApi';
import { getOperation, type Operation } from '../domain/operations';
import { formatNumber, parseOperand } from '../utils/validation';

export interface HistoryEntry {
  id: number;
  expression: string;
  result: string;
}

export const HISTORY_LIMIT = 50;

/**
 * Owns calculator state: inputs, validation, the API call and history.
 * The API function is injectable so the hook and UI can be tested in isolation.
 */
export function useCalculator(calculateFn: CalculateFn = defaultCalculate) {
  const [operation, setOperationState] = useState<Operation>('add');
  const [inputs, setInputs] = useState<[string, string]>(['', '']);
  const [fieldErrors, setFieldErrors] = useState<[string?, string?]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const requestId = useRef(0);

  const meta = getOperation(operation);

  const setOperation = useCallback((op: Operation) => {
    setOperationState(op);
    setFieldErrors([]);
    setError(null);
  }, []);

  const setInput = useCallback((index: 0 | 1, value: string) => {
    setInputs((prev) => (index === 0 ? [value, prev[1]] : [prev[0], value]));
    setFieldErrors((prev) => {
      const next: [string?, string?] = [...prev];
      next[index] = undefined;
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    const active = inputs.slice(0, meta.arity);
    const parsed = active.map(parseOperand);
    const errors = parsed.map((p) => (p.ok ? undefined : p.error)) as [string?, string?];
    setFieldErrors(errors);
    if (errors.some(Boolean)) return;

    const operands = parsed.map((p) => (p.ok ? p.value : 0));
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await calculateFn(operation, operands);
      if (id !== requestId.current) return; // a newer request superseded this one
      const formatted = formatNumber(response.result);
      setResult(formatted);
      setHistory((prev) =>
        [{ id, expression: meta.format(active.map((s) => s.trim())), result: formatted }, ...prev].slice(0, HISTORY_LIMIT),
      );
    } catch (e) {
      if (id !== requestId.current) return;
      setResult(null);
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [calculateFn, inputs, meta, operation]);

  const clear = useCallback(() => {
    requestId.current++;
    setInputs(['', '']);
    setFieldErrors([]);
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    operation, meta, inputs, fieldErrors, result, error, loading, history,
    setOperation, setInput, submit, clear, clearHistory,
  };
}
