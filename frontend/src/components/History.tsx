import { useEffect, useState } from 'react';
import type { HistoryEntry } from '../hooks/useCalculator';

export const HISTORY_PAGE_SIZE = 5;

interface Props {
  entries: HistoryEntry[];
  onClear: () => void;
  pageSize?: number;
}

export function History({ entries, onClear, pageSize = HISTORY_PAGE_SIZE }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const newestId = entries[0]?.id;

  // Jump back to the first page whenever a new calculation is added,
  // so the latest result is always visible.
  useEffect(() => setPage(1), [newestId]);

  if (entries.length === 0) return null;

  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const visible = entries.slice(start, start + pageSize);

  return (
    <section className="history" aria-label="History">
      <header>
        <h2>History</h2>
        <button type="button" className="link-button" onClick={onClear}>
          Clear
        </button>
      </header>
      <ol start={start + 1}>
        {visible.map((entry) => (
          <li key={entry.id}>
            <span className="history-expr">{entry.expression}</span>
            <span className="history-result">= {entry.result}</span>
          </li>
        ))}
      </ol>
      {totalPages > 1 && (
        <nav className="pagination" aria-label="History pages">
          <button
            type="button"
            className="page-button"
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
          >
            ‹ Prev
          </button>
          <span className="page-info" aria-live="polite">
            Page {current} of {totalPages}
          </span>
          <button
            type="button"
            className="page-button"
            onClick={() => setPage(current + 1)}
            disabled={current === totalPages}
          >
            Next ›
          </button>
        </nav>
      )}
    </section>
  );
}
