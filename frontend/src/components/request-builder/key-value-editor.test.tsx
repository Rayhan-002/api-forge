import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { newRow } from '@/store/request-builder-store';
import type { KeyValueRow } from '@/types/request';
import { KeyValueEditor } from './key-value-editor';

function ControlledEditor({ initialRows }: { initialRows: KeyValueRow[] }) {
  const [rows, setRows] = useState(initialRows);
  return <KeyValueEditor rows={rows} onChange={setRows} />;
}

describe('KeyValueEditor', () => {
  it('renders a single blank row to start', () => {
    render(<ControlledEditor initialRows={[newRow()]} />);
    expect(screen.getAllByPlaceholderText('Key')).toHaveLength(1);
  });

  it('typing into the trailing blank row appends a new blank row', async () => {
    const user = userEvent.setup();
    render(<ControlledEditor initialRows={[newRow()]} />);

    await user.type(screen.getByPlaceholderText('Key'), 'Content-Type');

    expect(screen.getAllByPlaceholderText('Key')).toHaveLength(2);
    expect(screen.getByDisplayValue('Content-Type')).toBeInTheDocument();
  });

  it('removing a row leaves a single trailing blank row behind', async () => {
    const user = userEvent.setup();
    const rows: KeyValueRow[] = [
      { id: '1', key: 'X-Trace', value: 'abc', enabled: true },
      newRow(),
    ];
    render(<ControlledEditor initialRows={rows} />);

    await user.click(screen.getAllByLabelText('Remove row')[0]);

    expect(screen.queryByDisplayValue('X-Trace')).not.toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Key')).toHaveLength(1);
  });

  it("toggling the Enabled checkbox flips that row's enabled state", async () => {
    const user = userEvent.setup();
    const rows: KeyValueRow[] = [
      { id: '1', key: 'X-Trace', value: 'abc', enabled: true },
      newRow(),
    ];
    render(<ControlledEditor initialRows={rows} />);

    const checkbox = screen.getAllByLabelText('Enabled')[0];
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });
});
