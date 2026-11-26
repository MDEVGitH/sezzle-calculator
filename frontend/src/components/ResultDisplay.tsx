interface Props {
  result: string | null;
  error: string | null;
  loading: boolean;
}

export function ResultDisplay({ result, error, loading }: Props) {
  return (
    <div className="display" aria-live="polite">
      {error ? (
        <p className="display-error" role="alert">
          {error}
        </p>
      ) : (
        <output className={`display-value${loading ? ' loading' : ''}`} data-testid="result">
          {result ?? '—'}
        </output>
      )}
    </div>
  );
}
