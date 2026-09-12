export function ResponseHeadersTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No headers.</div>;
  }

  return (
    <div className="p-4">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-border last:border-0">
              <td className="w-1/3 py-1.5 pr-4 align-top font-mono text-xs text-muted-foreground">
                {key}
              </td>
              <td className="break-all py-1.5 font-mono text-xs text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
