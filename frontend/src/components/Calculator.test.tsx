import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, type CalculateFn, type CalculationResult } from '../api/calculatorApi';
import { HISTORY_LIMIT, useCalculator } from '../hooks/useCalculator';
import { Calculator } from './Calculator';
import { HISTORY_PAGE_SIZE } from './History';

function setup(calculateFn: CalculateFn) {
  const user = userEvent.setup();
  render(<Calculator calculateFn={calculateFn} />);
  return { user };
}

const ok = (result: number): CalculateFn => vi.fn(async (operation, operands) => ({ operation, operands, result }));

describe('Calculator', () => {
  it('calculates and shows the result and history', async () => {
    const calculateFn = ok(5);
    const { user } = setup(calculateFn);

    await user.type(screen.getByLabelText('First number'), '2');
    await user.type(screen.getByLabelText('Second number'), '3');
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(await screen.findByTestId('result')).toHaveTextContent('5');
    expect(calculateFn).toHaveBeenCalledWith('add', [2, 3]);
    const history = screen.getByRole('region', { name: 'History' });
    expect(within(history).getByText('2 + 3')).toBeInTheDocument();
    expect(within(history).getByText('= 5')).toBeInTheDocument();
  });

  it('submits with the Enter key', async () => {
    const calculateFn = ok(10);
    const { user } = setup(calculateFn);
    await user.click(screen.getByRole('radio', { name: 'Multiply' }));
    await user.type(screen.getByLabelText('First number'), '2');
    await user.type(screen.getByLabelText('Second number'), '5{Enter}');
    expect(await screen.findByTestId('result')).toHaveTextContent('10');
    expect(calculateFn).toHaveBeenCalledWith('multiply', [2, 5]);
  });

  it('shows a single input for square root', async () => {
    const calculateFn = ok(4);
    const { user } = setup(calculateFn);
    await user.click(screen.getByRole('radio', { name: 'Square root' }));

    expect(screen.queryByLabelText('Second number')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Number'), '16');
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(await screen.findByTestId('result')).toHaveTextContent('4');
    expect(calculateFn).toHaveBeenCalledWith('sqrt', [16]);
    expect(screen.getByText('√16')).toBeInTheDocument();
  });

  it('validates input before calling the API', async () => {
    const calculateFn = ok(0);
    const { user } = setup(calculateFn);

    await user.type(screen.getByLabelText('First number'), 'abc');
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(screen.getByText('Not a valid number')).toBeInTheDocument();
    expect(screen.getByText('Enter a number')).toBeInTheDocument();
    expect(screen.getByLabelText('First number')).toHaveAttribute('aria-invalid', 'true');
    expect(calculateFn).not.toHaveBeenCalled();

    // Editing a field clears its error.
    await user.clear(screen.getByLabelText('First number'));
    await user.type(screen.getByLabelText('First number'), '1');
    expect(screen.queryByText('Not a valid number')).not.toBeInTheDocument();
  });

  it('shows API errors such as division by zero', async () => {
    const calculateFn: CalculateFn = vi.fn().mockRejectedValue(new ApiError('DIVISION_BY_ZERO', 'division by zero', 422));
    const { user } = setup(calculateFn);
    await user.click(screen.getByRole('radio', { name: 'Divide' }));
    await user.type(screen.getByLabelText('Dividend'), '1');
    await user.type(screen.getByLabelText('Divisor'), '0');
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('division by zero');
  });

  it('shows a generic message for unexpected errors', async () => {
    const calculateFn: CalculateFn = vi.fn().mockRejectedValue(new Error('boom'));
    const { user } = setup(calculateFn);
    await user.type(screen.getByLabelText('First number'), '1');
    await user.type(screen.getByLabelText('Second number'), '1');
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('disables the submit button while a request is in flight', async () => {
    let resolve!: (r: CalculationResult) => void;
    const calculateFn: CalculateFn = vi.fn(() => new Promise<CalculationResult>((r) => (resolve = r)));
    const { user } = setup(calculateFn);
    await user.type(screen.getByLabelText('First number'), '1');
    await user.type(screen.getByLabelText('Second number'), '1');
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled();
    resolve({ operation: 'add', operands: [1, 1], result: 2 });
    await waitFor(() => expect(screen.getByRole('button', { name: '=' })).toBeEnabled());
  });

  it('clears inputs and result', async () => {
    const { user } = setup(ok(3));
    await user.type(screen.getByLabelText('First number'), '1');
    await user.type(screen.getByLabelText('Second number'), '2');
    await user.click(screen.getByRole('button', { name: '=' }));
    await screen.findByText('= 3');

    await user.click(screen.getAllByRole('button', { name: 'Clear' })[0]);
    expect(screen.getByLabelText('First number')).toHaveValue('');
    expect(screen.getByTestId('result')).toHaveTextContent('—');

    // Clearing history removes the panel.
    await user.click(within(screen.getByRole('region', { name: 'History' })).getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument();
  });

  it('paginates history and returns to page 1 on a new calculation', async () => {
    const { user } = setup(ok(2));
    await user.type(screen.getByLabelText('First number'), '1');
    await user.type(screen.getByLabelText('Second number'), '1');
    for (let i = 0; i < HISTORY_PAGE_SIZE + 1; i++) {
      await user.click(screen.getByRole('button', { name: '=' }));
      await screen.findByRole('button', { name: '=' });
    }
    const history = screen.getByRole('region', { name: 'History' });
    expect(within(history).getAllByRole('listitem')).toHaveLength(HISTORY_PAGE_SIZE);
    expect(within(history).getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(within(history).getByRole('button', { name: /Next/ }));
    expect(within(history).getAllByRole('listitem')).toHaveLength(1);
    expect(within(history).getByText('Page 2 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '=' }));
    await waitFor(() => expect(within(history).getByText('Page 1 of 2')).toBeInTheDocument());
  });
});

describe('useCalculator history limit', () => {
  it(`keeps at most ${HISTORY_LIMIT} entries, newest first`, async () => {
    let n = 0;
    const calculateFn: CalculateFn = async (operation, operands) => ({ operation, operands, result: ++n });
    const { result } = renderHook(() => useCalculator(calculateFn));
    act(() => {
      result.current.setInput(0, '1');
      result.current.setInput(1, '1');
    });
    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      await act(() => result.current.submit());
    }
    expect(result.current.history).toHaveLength(HISTORY_LIMIT);
    expect(result.current.history[0].result).toBe(String(HISTORY_LIMIT + 3));
  });
});
