import { CopyButton } from './CopyButton';

export type SnippetLanguage = 'bash' | 'json' | 'ts';

/**
 * A minimal highlighter, on purpose. A syntax-highlighting library would cost
 * more first-load JavaScript than the whole developer section is worth, and
 * three token classes are enough for the two snippets on the page.
 */
type Token = { text: string; kind: 'plain' | 'key' | 'string' | 'number' | 'keyword' | 'comment' };

const TS_KEYWORDS = new Set([
  'const',
  'let',
  'await',
  'async',
  'function',
  'return',
  'import',
  'from',
  'export',
  'for',
  'of',
  'if',
  'new',
]);

function tokenize(code: string, language: SnippetLanguage): Token[] {
  const pattern =
    language === 'json'
      ? /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|(true|false|null)/g
      : language === 'bash'
        ? /(#[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(-{1,2}[A-Za-z][\w-]*)/g
        : /(\/\/[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b/g;

  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index), kind: 'plain' });
    }
    const [full, a, b, c, d] = match;
    if (language === 'json') {
      if (a) tokens.push({ text: a, kind: 'key' });
      else if (b) tokens.push({ text: b, kind: 'string' });
      else if (c) tokens.push({ text: c, kind: 'number' });
      else tokens.push({ text: full, kind: 'keyword' });
    } else if (language === 'bash') {
      if (a) tokens.push({ text: a, kind: 'comment' });
      else if (b) tokens.push({ text: b, kind: 'string' });
      else tokens.push({ text: full, kind: 'keyword' });
    } else {
      if (a) tokens.push({ text: a, kind: 'comment' });
      else if (b) tokens.push({ text: b, kind: 'string' });
      else if (c) tokens.push({ text: c, kind: 'number' });
      else tokens.push({ text: full, kind: d && TS_KEYWORDS.has(d) ? 'keyword' : 'plain' });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < code.length) tokens.push({ text: code.slice(lastIndex), kind: 'plain' });
  return tokens;
}

const TOKEN_STYLE: Record<Token['kind'], React.CSSProperties> = {
  plain: { color: 'var(--code-fg)' },
  key: { color: 'var(--code-key)' },
  string: { color: 'var(--code-string)' },
  number: { color: 'var(--code-number)' },
  keyword: { color: 'var(--code-number)' },
  comment: { color: 'var(--code-comment)' },
};

/**
 * A server component: the tokeniser runs at build time and only the copy
 * button crosses into the client bundle.
 */
export function CodeSnippet({
  code,
  language = 'bash',
  label,
  className,
}: {
  code: string;
  language?: SnippetLanguage;
  label?: string;
  className?: string;
}) {
  return (
    // min-w-0: a grid or flex child sizes to its content by default, which
    // would otherwise let a long line of code widen the whole page on a phone.
    <div
      className={['code-block min-w-0 overflow-hidden rounded-card border', className ?? ''].join(' ')}
    >
      <div className="code-block__chrome flex items-center justify-between gap-4 border-b px-4 py-3">
        <span className="text-xs font-medium" style={{ color: 'var(--code-comment)' }}>
          {label ?? language}
        </span>
        <CopyButton value={code} />
      </div>
      {/* Focusable: the snippet scrolls sideways, so it has to be reachable
          and scrollable from the keyboard. */}
      <pre
        tabIndex={0}
        role="region"
        aria-label={`${label ?? language} snippet`}
        className="min-w-0 overflow-x-auto px-4 py-4 text-sm"
      >
        <code className="font-mono">
          {tokenize(code, language).map((token, index) => (
            <span key={index} style={TOKEN_STYLE[token.kind]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
