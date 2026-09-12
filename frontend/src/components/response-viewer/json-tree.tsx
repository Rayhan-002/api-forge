'use client';

import { useState } from 'react';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function ValueLabel({ value }: { value: JsonValue }) {
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (typeof value === 'string') return <span className="text-success">&quot;{value}&quot;</span>;
  if (typeof value === 'number') return <span className="text-info">{value}</span>;
  if (typeof value === 'boolean') return <span className="text-method-patch">{String(value)}</span>;
  return null;
}

function JsonNode({ label, value, depth }: { label?: string; value: JsonValue; depth: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object' && !isArray;

  if (!isArray && !isObject) {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {label !== undefined && (
          <span className="text-muted-foreground">&quot;{label}&quot;: </span>
        )}
        <ValueLabel value={value} />
      </div>
    );
  }

  const entries = isArray
    ? (value as JsonValue[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, JsonValue>);
  const [openBracket, closeBracket] = isArray ? ['[', ']'] : ['{', '}'];

  return (
    <div>
      <div style={{ paddingLeft: depth * 16 }}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex items-center gap-1 text-foreground hover:text-accent"
        >
          <span className="inline-block w-3 text-center text-muted-foreground">
            {collapsed ? '▸' : '▾'}
          </span>
          {label !== undefined && (
            <span className="text-muted-foreground">&quot;{label}&quot;: </span>
          )}
          <span className="text-muted-foreground">{openBracket}</span>
          {collapsed && (
            <span className="text-muted-foreground">
              {' '}
              {entries.length} {isArray ? 'items' : 'keys'} {closeBracket}
            </span>
          )}
        </button>
      </div>
      {!collapsed && (
        <>
          {entries.map(([key, childValue]) => (
            <JsonNode
              key={key}
              label={isArray ? undefined : key}
              value={childValue}
              depth={depth + 1}
            />
          ))}
          <div style={{ paddingLeft: depth * 16 }} className="text-muted-foreground">
            {closeBracket}
          </div>
        </>
      )}
    </div>
  );
}

/** Small, dependency-free collapsible JSON viewer. */
export function JsonTree({ data }: { data: JsonValue }) {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <JsonNode value={data} depth={0} />
    </div>
  );
}
