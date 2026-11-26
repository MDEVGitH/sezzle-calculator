interface Props {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function OperandInput({ id, label, value, error, onChange }: Props) {
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
