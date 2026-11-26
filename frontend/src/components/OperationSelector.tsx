import { OPERATIONS, type Operation } from '../domain/operations';

interface Props {
  value: Operation;
  onChange: (op: Operation) => void;
}

export function OperationSelector({ value, onChange }: Props) {
  return (
    <div className="operations" role="radiogroup" aria-label="Operation">
      {OPERATIONS.map((op) => (
        <button
          key={op.id}
          type="button"
          role="radio"
          aria-checked={value === op.id}
          aria-label={op.name}
          title={op.name}
          className={`op-button${value === op.id ? ' active' : ''}`}
          onClick={() => onChange(op.id)}
        >
          {op.symbol}
        </button>
      ))}
    </div>
  );
}
