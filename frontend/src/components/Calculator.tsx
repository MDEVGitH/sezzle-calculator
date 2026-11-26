import type { FormEvent } from 'react';
import type { CalculateFn } from '../api/calculatorApi';
import { useCalculator } from '../hooks/useCalculator';
import { History } from './History';
import { OperandInput } from './OperandInput';
import { OperationSelector } from './OperationSelector';
import { ResultDisplay } from './ResultDisplay';

interface Props {
  calculateFn?: CalculateFn;
}

export function Calculator({ calculateFn }: Props) {
  const calc = useCalculator(calculateFn);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void calc.submit();
  };

  return (
    <div className="calculator">
      <ResultDisplay result={calc.result} error={calc.error} loading={calc.loading} />

      <form onSubmit={onSubmit} noValidate>
        <OperationSelector value={calc.operation} onChange={calc.setOperation} />

        <div className={`fields arity-${calc.meta.arity}`}>
          {calc.meta.operandLabels.map((label, i) => (
            <OperandInput
              key={i}
              id={`operand-${i}`}
              label={label}
              value={calc.inputs[i]}
              error={calc.fieldErrors[i]}
              onChange={(v) => calc.setInput(i as 0 | 1, v)}
            />
          ))}
        </div>

        <div className="actions">
          <button type="button" className="secondary" onClick={calc.clear}>
            Clear
          </button>
          <button type="submit" className="primary" disabled={calc.loading}>
            {calc.loading ? 'Calculating…' : '='}
          </button>
        </div>
      </form>

      <History entries={calc.history} onClear={calc.clearHistory} />
    </div>
  );
}
