export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage';

export interface OperationMeta {
  id: Operation;
  /** Short label rendered on the operation button. */
  symbol: string;
  /** Accessible, human-readable name. */
  name: string;
  arity: 1 | 2;
  operandLabels: readonly [string] | readonly [string, string];
  /** Renders a human-readable expression such as "2 + 3". */
  format: (operands: readonly string[]) => string;
}

export const OPERATIONS: readonly OperationMeta[] = [
  { id: 'add', symbol: '+', name: 'Add', arity: 2, operandLabels: ['First number', 'Second number'], format: ([a, b]) => `${a} + ${b}` },
  { id: 'subtract', symbol: '−', name: 'Subtract', arity: 2, operandLabels: ['First number', 'Second number'], format: ([a, b]) => `${a} − ${b}` },
  { id: 'multiply', symbol: '×', name: 'Multiply', arity: 2, operandLabels: ['First number', 'Second number'], format: ([a, b]) => `${a} × ${b}` },
  { id: 'divide', symbol: '÷', name: 'Divide', arity: 2, operandLabels: ['Dividend', 'Divisor'], format: ([a, b]) => `${a} ÷ ${b}` },
  { id: 'power', symbol: 'xʸ', name: 'Power', arity: 2, operandLabels: ['Base', 'Exponent'], format: ([a, b]) => `${a} ^ ${b}` },
  { id: 'sqrt', symbol: '√', name: 'Square root', arity: 1, operandLabels: ['Number'], format: ([a]) => `√${a}` },
  { id: 'percentage', symbol: '%', name: 'Percentage', arity: 2, operandLabels: ['Percent', 'Of'], format: ([a, b]) => `${a}% of ${b}` },
];

export function getOperation(id: Operation): OperationMeta {
  const meta = OPERATIONS.find((op) => op.id === id);
  if (!meta) throw new Error(`Unknown operation: ${id}`);
  return meta;
}
