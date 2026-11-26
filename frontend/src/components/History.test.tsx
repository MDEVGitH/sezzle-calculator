import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HistoryEntry } from '../hooks/useCalculator';
import { History } from './History';

const makeEntries = (count: number, firstId = count): HistoryEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    id: firstId - i,
    expression: `${firstId - i} + 0`,
    result: String(firstId - i),
  }));

describe('History pagination', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<History entries={[]} onClear={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides the paginator when everything fits on one page', () => {
    render(<History entries={makeEntries(3)} onClear={() => {}} pageSize={5} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('navigation', { name: 'History pages' })).not.toBeInTheDocument();
  });

  it('navigates between pages and disables buttons at the edges', async () => {
    const user = userEvent.setup();
    render(<History entries={makeEntries(12)} onClear={() => {}} pageSize={5} />);
    const prev = screen.getByRole('button', { name: /Prev/ });
    const next = screen.getByRole('button', { name: /Next/ });

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(prev).toBeDisabled();
    expect(screen.getByText('12 + 0')).toBeInTheDocument();

    await user.click(next);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('7 + 0')).toBeInTheDocument();
    expect(screen.queryByText('12 + 0')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveAttribute('start', '6');

    await user.click(next);
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(next).toBeDisabled();

    await user.click(prev);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('clamps to the last page when entries shrink', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<History entries={makeEntries(12)} onClear={() => {}} pageSize={5} />);
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();

    // Same newest entry, fewer items: stays on the last available page.
    rerender(<History entries={makeEntries(12).slice(0, 7)} onClear={() => {}} pageSize={5} />);
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('calls onClear', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<History entries={makeEntries(2)} onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
