import { getOperation, OPERATIONS, type Operation } from './operations';

describe('operations', () => {
  it('defines a label for every operand', () => {
    for (const op of OPERATIONS) {
      expect(op.operandLabels).toHaveLength(op.arity);
    }
  });

  it.each<[Operation, string[], string]>([
    ['add', ['1', '2'], '1 + 2'],
    ['subtract', ['1', '2'], '1 − 2'],
    ['multiply', ['1', '2'], '1 × 2'],
    ['divide', ['1', '2'], '1 ÷ 2'],
    ['power', ['2', '3'], '2 ^ 3'],
    ['sqrt', ['9'], '√9'],
    ['percentage', ['10', '50'], '10% of 50'],
  ])('formats %s expressions', (id, operands, expected) => {
    expect(getOperation(id).format(operands)).toBe(expected);
  });

  it('throws for unknown operations', () => {
    expect(() => getOperation('modulo' as Operation)).toThrow('Unknown operation');
  });
});
