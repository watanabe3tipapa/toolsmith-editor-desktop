import React, { useMemo } from 'react';
import AbcSheet from './AbcSheet';

type MarkdownPreviewProps = {
  markdown: string;
};

const ABC_FENCE = /```\s*(?:music-)?abc\s*\r?\n([\s\S]*?)```/g;

function extractAbcBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = ABC_FENCE.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const abcBlocks = useMemo(() => extractAbcBlocks(markdown), [markdown]);

  return (
    <div className="relative p-4 mt-4 min-h-[150px] border border-primary/30 rounded text-left">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-primary font-bold text-lg text-left">Source Preview</h2>
        {abcBlocks.length > 0 && (
          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-orbitron text-[10px] tracking-[0.14em] text-primary">
            ABC x{abcBlocks.length}
          </span>
        )}
      </div>
      <pre className="text-foreground/80 whitespace-pre-wrap font-mono text-sm text-left">
        {markdown || 'Start typing to see markdown preview...'}
      </pre>
      {abcBlocks.map((abc, index) => (
        <AbcSheet key={`abc-${index}`} abc={abc} />
      ))}
    </div>
  );
}

export default MarkdownPreview;