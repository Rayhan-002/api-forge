import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { JsonTree } from './json-tree';

describe('JsonTree', () => {
  it('renders scalar values with their type-appropriate formatting', () => {
    render(<JsonTree data={{ name: 'Ada', age: 36, active: true, note: null }} />);

    expect(screen.getByText('"Ada"')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('renders nested object and array structure, expanded by default', () => {
    render(<JsonTree data={{ user: { id: 1 }, tags: ['a', 'b'] }} />);

    // Key labels render as `"id": ` in one span, so match by substring.
    expect(screen.getByText(/"id"/)).toBeInTheDocument();
    // Array items have no key label, just the bare value.
    expect(screen.getByText('"a"')).toBeInTheDocument();
    expect(screen.getByText('"b"')).toBeInTheDocument();
  });

  it('collapses a node on click, hiding its children and showing a count', async () => {
    const user = userEvent.setup();
    render(<JsonTree data={{ items: ['x', 'y', 'z'] }} />);

    expect(screen.getByText('"x"')).toBeInTheDocument();

    await user.click(screen.getByText(/"items"/));

    expect(screen.queryByText('"x"')).not.toBeInTheDocument();
    expect(screen.getByText(/3 items/)).toBeInTheDocument();
  });

  it('expands a collapsed node again on a second click', async () => {
    const user = userEvent.setup();
    render(<JsonTree data={{ items: ['x'] }} />);

    const toggle = screen.getByText(/"items"/);
    await user.click(toggle);
    expect(screen.queryByText('"x"')).not.toBeInTheDocument();

    await user.click(screen.getByText(/"items"/));
    expect(screen.getByText('"x"')).toBeInTheDocument();
  });
});
