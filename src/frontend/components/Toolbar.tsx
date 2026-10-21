import React, { useCallback, useEffect, useState } from 'react';
import { EditorState } from 'lexical';
import { $getSelection, $isRangeSelection, $createParagraphNode, $getNodeByKey, UNDO_COMMAND, REDO_COMMAND, FORMAT_TEXT_COMMAND } from 'lexical';
import { INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Terminal,
  Link,
  Undo,
  Redo,
  Subscript,
  Superscript,
  Minus,
  Table2,
  Download,
} from 'lucide-react';
import { EXPORT_OPTIONS, saveExport } from '../lib/export';
import type { ExportOption } from '../lib/export';
import { alertMessage, parseBridgeError } from '../lib/desktop';
import LinkEditorModal from './LinkEditorModal';

type ToolbarButtonProps = {
  icon: React.ComponentType<{ size?: number }>;
  isActive?: boolean;
  onClick: () => void;
  title: string;
};

function ToolbarButton({ icon: Icon, isActive, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={isActive || undefined}
      className={`toolbar-button p-2 transition-all rounded hover:bg-primary/20 ${
        isActive
          ? 'is-active text-primary drop-shadow-[0_0_8px_var(--color-primary)]'
          : 'text-foreground/70 hover:text-primary'
      }`}
    >
      <Icon size={18} />
    </button>
  );
}

function Divider() {
  return <div className="toolbar-divider w-px h-6 bg-primary/30 mx-1" aria-hidden="true" />;
}

type ToolbarProps = {
  editor: any;
  markdown: string;
  documentName?: string | null;
};

function Toolbar({ editor, markdown, documentName }: ToolbarProps) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));
        setIsStrikethrough(selection.hasFormat('strikethrough'));
        setIsCode(selection.hasFormat('code'));
        setIsSubscript(selection.hasFormat('subscript'));
        setIsSuperscript(selection.hasFormat('superscript'));
        setIsLink(selection.hasFormat('link'));
      }
    };

    return editor.registerUpdateListener(({ editorState }: { editorState: EditorState }) => {
      editorState.read(updateToolbar);
    });
  }, [editor]);

  const undo = useCallback(() => {
    editor?.dispatchCommand(UNDO_COMMAND, undefined);
  }, [editor]);

  const redo = useCallback(() => {
    editor?.dispatchCommand(REDO_COMMAND, undefined);
  }, [editor]);

  const formatText = useCallback((format: string) => {
    editor?.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  }, [editor]);

  const insertHeading = useCallback((level: string) => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        const paragraph = $createParagraphNode();
        const root = $getNodeByKey('root');
        root?.append(paragraph);
        const heading = $createHeadingNode(level);
        paragraph.replace(heading);
        heading.select(0, 0);
        return;
      }
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      if (topLevel) {
        const heading = $createHeadingNode(level);
        const paragraph = $createParagraphNode();
        heading.append(paragraph);
        topLevel.replace(heading);
        heading.select(0, 0);
      }
    });
  }, [editor]);

  const insertQuote = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        const root = $getNodeByKey('root');
        if (root) {
          const quote = $createQuoteNode();
          const paragraph = $createParagraphNode();
          quote.append(paragraph);
          root.append(quote);
          quote.select(0, 0);
        }
        return;
      }
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      if (topLevel) {
        const quote = $createQuoteNode();
        const paragraph = $createParagraphNode();
        quote.append(paragraph);
        topLevel.replace(quote);
        quote.select(0, 0);
      }
    });
  }, [editor]);

  const insertCodeBlock = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        const root = $getNodeByKey('root');
        if (root) {
          const code = $createCodeNode();
          const paragraph = $createParagraphNode();
          code.append(paragraph);
          root.append(code);
          code.select(0, 0);
        }
        return;
      }
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      if (topLevel) {
        const code = $createCodeNode();
        const paragraph = $createParagraphNode();
        code.append(paragraph);
        topLevel.replace(code);
        code.select(0, 0);
      }
    });
  }, [editor]);

  const insertList = useCallback((listType: 'bullet' | 'number' | 'check') => {
    if (!editor) return;
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else if (listType === 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else if (listType === 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    }
  }, [editor]);

  const insertLink = useCallback(() => {
    setLinkModalOpen(true);
  }, []);

  const submitLink = useCallback(
    (url: string) => {
      editor?.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    },
    [editor],
  );

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3', includeHeaders: { rows: true, columns: false } });
  }, [editor]);

  const insertHorizontalRule = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([$createParagraphNode()]);
      }
      const paragraph = $createParagraphNode();
      const root = $getNodeByKey('root');
      root?.append(paragraph);
    });
  }, [editor]);

  const downloadOptions = EXPORT_OPTIONS(markdown);

  const handleExport = async (option: ExportOption) => {
    setShowDownloadMenu(false);
    try {
      await saveExport(option, documentName);
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('エクスポートできませんでした。', parsed.message);
    }
  };

  return (
    <div className="editor-toolbar flex flex-wrap items-center gap-1 p-2 border-b border-primary/30 bg-black/20" role="toolbar" aria-label="書式ツールバー">
      <ToolbarButton icon={Undo} onClick={undo} title="Undo" />
      <ToolbarButton icon={Redo} onClick={redo} title="Redo" />
      <Divider />
      <ToolbarButton icon={Bold} isActive={isBold} onClick={() => formatText('bold')} title="Bold" />
      <ToolbarButton icon={Italic} isActive={isItalic} onClick={() => formatText('italic')} title="Italic" />
      <ToolbarButton icon={Underline} isActive={isUnderline} onClick={() => formatText('underline')} title="Underline" />
      <ToolbarButton icon={Strikethrough} isActive={isStrikethrough} onClick={() => formatText('strikethrough')} title="Strikethrough" />
      <ToolbarButton icon={Code} isActive={isCode} onClick={() => formatText('code')} title="Inline Code" />
      <ToolbarButton icon={Subscript} isActive={isSubscript} onClick={() => formatText('subscript')} title="Subscript" />
      <ToolbarButton icon={Superscript} isActive={isSuperscript} onClick={() => formatText('superscript')} title="Superscript" />
      <Divider />
      <ToolbarButton icon={Heading1} onClick={() => insertHeading('h1')} title="Heading 1" />
      <ToolbarButton icon={Heading2} onClick={() => insertHeading('h2')} title="Heading 2" />
      <ToolbarButton icon={Heading3} onClick={() => insertHeading('h3')} title="Heading 3" />
      <ToolbarButton icon={Heading4} onClick={() => insertHeading('h4')} title="Heading 4" />
      <ToolbarButton icon={Heading5} onClick={() => insertHeading('h5')} title="Heading 5" />
      <ToolbarButton icon={Heading6} onClick={() => insertHeading('h6')} title="Heading 6" />
      <Divider />
      <ToolbarButton icon={List} onClick={() => insertList('bullet')} title="Bullet List" />
      <ToolbarButton icon={ListOrdered} onClick={() => insertList('number')} title="Numbered List" />
      <ToolbarButton icon={ListChecks} onClick={() => insertList('check')} title="Check List" />
      <ToolbarButton icon={Quote} onClick={insertQuote} title="Quote" />
      <ToolbarButton icon={Terminal} onClick={insertCodeBlock} title="Code Block" />
      <Divider />
      <ToolbarButton icon={Link} isActive={isLink} onClick={insertLink} title="Insert Link" />
      <ToolbarButton icon={Table2} onClick={insertTable} title="Insert Table" />
      <ToolbarButton icon={Minus} onClick={insertHorizontalRule} title="Horizontal Rule" />
      <Divider />
      <div className="relative">
        <ToolbarButton icon={Download} isActive={showDownloadMenu} onClick={() => setShowDownloadMenu(!showDownloadMenu)} title="エクスポート" />
        {showDownloadMenu && (
            <div className="export-menu absolute top-full left-0 mt-1 py-1 bg-black/90 border border-primary/50 rounded shadow-lg z-50 min-w-[160px]" role="menu" aria-label="エクスポート形式">
            {downloadOptions.map((option) => (
              <button
                key={option.ext}
                type="button"
                role="menuitem"
                onClick={() => void handleExport(option)}
                className="block w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <LinkEditorModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSubmit={submitLink}
      />
    </div>
  );
}

export default Toolbar;