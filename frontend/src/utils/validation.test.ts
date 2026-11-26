import { formatNumber, parseOperand } from './validation';

describe('parseOperand', () => {
  it.each([
    ['42', 42],
    ['-3.5', -3.5],
    ['+7', 7],
    ['.5', 0.5],
    ['5.', 5],
    ['  12  ', 12],
    ['1e3', 1000],
    ['2.5E-2', 0.025],
  ])('accepts %s', (input, expected) => {
    expect(parseOperand(input)).toEqual({ ok: true, value: expected });
  });

  it('rejects empty input', () => {
    expect(parseOperand('   ')).toEqual({ ok: false, error: 'Enter a number' });
  });

  it.each(['abc', '1,000', '1.2.3', '--1', 'Infinity', 'NaN', '0x10', '1e', '.'])('rejects %s', (input) => {
    expect(parseOperand(input)).toEqual({ ok: false, error: 'Not a valid number' });
  });

  it('rejects numbers that overflow', () => {
    expect(parseOperand('1e400')).toEqual({ ok: false, error: 'Number is too large' });
  });
});

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [42, '42'],
    [0.1 + 0.2, '0.3'],
    [-2.5, '-2.5'],
    [1 / 3, '0.333333333333'],
    [1e20, '1e+20'],
    [1.5e-12, '1.5e-12'],
  ])('formats %s as %s', (n, expected) => {
    expect(formatNumber(n)).toBe(expected);
  });
});
