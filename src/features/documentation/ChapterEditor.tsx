import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Check,
  Italic,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useDocumentationStore } from "@/lib/stores/documentationStore";
import { countWords, cn } from "@/lib/utils";
import { markdownToHtml } from "@/lib/markdown";
import type { SectionStatus } from "@/types";

const AUTOSAVE_DELAY_MS = 800;
const FIGURE_STYLE = `
  .figure-placeholder {
    border: 1px dashed #cbd5e1;
    background: #f8fafc;
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
    text-align: center;
  }
  .figure-placeholder p { margin: 0; color: #64748b; font-size: 13px; }
  .figure-placeholder .figure-caption { font-style: italic; color: #94a3b8; margin-top: 6px; }
  .tiptap table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 14px;
  }
  .tiptap th, .tiptap td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  .tiptap th { background: #f1f5f9; font-weight: 600; }
  .tiptap blockquote {
    border-left: 3px solid #cbd5e1;
    padding-left: 12px;
    margin: 12px 0;
    color: #475569;
    font-style: italic;
  }
  .tiptap a { color: #2563eb; text-decoration: underline; }
`;

const PARAGRAPH_STYLES = [
  { value: "paragraph", label: "Normal text" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
];

function currentStyle(
  editor: NonNullable<ReturnType<typeof useEditor>>,
): string {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

export function ChapterEditor({
  pendingInsertHtml,
  onInsertConsumed,
}: {
  pendingInsertHtml?: string | null;
  onInsertConsumed?: () => void;
} = {}) {
  const chapters = useDocumentationStore((s) => s.chapters);
  const sections = useDocumentationStore((s) => s.sections);
  const selectedSectionId = useDocumentationStore((s) => s.selectedSectionId);
  const saveSectionContent = useDocumentationStore((s) => s.saveSectionContent);
  const changeStatus = useDocumentationStore((s) => s.changeStatus);

  const section = sections.find((s) => s.id === selectedSectionId) ?? null;
  const chapterTitle =
    chapters.find((c) => c.id === section?.chapterId)?.title ?? "";

  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [words, setWords] = useState(0);
  const loadedSectionId = useRef<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const saveRef = useRef<(html: string) => void>(() => undefined);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Start writing your section…" }),
    ],
    content: "",
    editorProps: { attributes: { class: "focus:outline-none tiptap" } },
    onUpdate: ({ editor }) => {
      setWords(countWords(editor.getHTML()));
      setDirty(true);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveRef.current(editor.getHTML());
      }, AUTOSAVE_DELAY_MS);
    },
  });

  // Keep latest save fn without re-registering onUpdate
  saveRef.current = (html: string) => {
    if (!section) return;
    saveSectionContent(section.id, html, countWords(html));
    setSavedAt(new Date().toLocaleTimeString());
    setDirty(false);
  };

  // Load selected section content exactly once per selection
  useEffect(() => {
    if (!editor || !section || loadedSectionId.current === section.id) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    editor.commands.setContent(section.content, false);
    loadedSectionId.current = section.id;
    setWords(section.wordCount);
    setDirty(false);
    setSavedAt(null);
  }, [editor, section]);

  // Insert AI-generated content when signaled from the AI panel.
  // The AI emits Markdown, so convert it to HTML (tables, headings, etc.).
  useEffect(() => {
    if (!editor || !pendingInsertHtml) return;
    const html = markdownToHtml(pendingInsertHtml);
    editor.chain().focus().insertContent(html).run();
    onInsertConsumed?.();
  }, [editor, pendingInsertHtml, onInsertConsumed]);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  if (!section) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-surface-400">
        Select a section to start writing.
      </div>
    );
  }

  const persistNow = () => {
    if (!editor || !dirty) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveRef.current(editor.getHTML());
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <style>{FIGURE_STYLE}</style>

      {/* Section header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-200 px-5 py-3 dark:border-surface-800">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {chapterTitle}
          </p>
          <h2 className="truncate text-sm font-semibold">{section.title}</h2>
        </div>

        <Select
          aria-label="Section status"
          className="h-8 w-auto text-xs"
          value={section.status}
          onChange={(e) =>
            changeStatus(section.id, e.target.value as SectionStatus)
          }
        >
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="complete">Complete</option>
        </Select>

        <span
          className={cn("text-[11px]", dirty ? "text-amber-500" : "text-surface-400")}
        >
          {dirty ? "Saving…" : savedAt ? `Saved ${savedAt}` : "All changes saved"}
        </span>

        <Button size="sm" variant="secondary" onClick={persistNow} disabled={!dirty}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-surface-200 px-4 py-2 dark:border-surface-800">
        <Select
          aria-label="Paragraph style"
          className="h-8 w-32 text-xs"
          value={editor ? currentStyle(editor) : "paragraph"}
          onChange={(e) => {
            if (!editor) return;
            const v = e.target.value;
            if (v === "paragraph") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
          }}
        >
          {PARAGRAPH_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <span className="mx-1 h-5 w-px bg-surface-200 dark:bg-surface-700" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          label={<Bold className="h-3.5 w-3.5" />}
          title="Bold"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          label={<Italic className="h-3.5 w-3.5" />}
          title="Italic"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          active={editor?.isActive("underline")}
          label={<UnderlineIcon className="h-3.5 w-3.5" />}
          title="Underline"
        />

        <span className="mx-1 h-5 w-px bg-surface-200 dark:bg-surface-700" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          label={<List className="h-3.5 w-3.5" />}
          title="Bullet list"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
          label={<ListOrdered className="h-3.5 w-3.5" />}
          title="Numbered list"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          label={<Quote className="h-3.5 w-3.5" />}
          title="Quote"
        />

        <span className="mx-1 h-5 w-px bg-surface-200 dark:bg-surface-700" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          active={editor?.isActive({ textAlign: "left" })}
          label={<AlignLeft className="h-3.5 w-3.5" />}
          title="Align left"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          active={editor?.isActive({ textAlign: "center" })}
          label={<AlignCenter className="h-3.5 w-3.5" />}
          title="Align center"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          active={editor?.isActive({ textAlign: "right" })}
          label={<AlignRight className="h-3.5 w-3.5" />}
          title="Align right"
        />

        <span className="mx-1 h-5 w-px bg-surface-200 dark:bg-surface-700" />

        <ToolbarButton
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          label={<TableIcon className="h-3.5 w-3.5" />}
          title="Insert table"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().addColumnAfter().run()}
          disabled={!editor?.isActive("table")}
          inline={true}
          label={<span className="text-xs font-semibold">+Col</span>}
          title="Add column"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().addRowAfter().run()}
          disabled={!editor?.isActive("table")}
          inline={true}
          label={<span className="text-xs font-semibold">+Row</span>}
          title="Add row"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().deleteRow().run()}
          disabled={!editor?.isActive("table")}
          inline={true}
          label={<span className="text-xs font-semibold">-Row</span>}
          title="Delete row"
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().deleteTable().run()}
          disabled={!editor?.isActive("table")}
          inline={true}
          label={<span className="text-xs font-semibold">Del</span>}
          title="Delete table"
        />

        <Badge tone="neutral" className="ml-auto tabular-nums">
          {words.toLocaleString()} words
        </Badge>
      </div>

      {/* Paper-like editor surface */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-100 px-4 py-8 dark:bg-surface-950 lg:px-10">
        <div className="mx-auto min-h-[60vh] max-w-3xl rounded-lg bg-white px-8 py-10 shadow-sm dark:bg-white dark:text-surface-900">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  inline,
  label,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  inline?: boolean;
  label: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-active={active}
      className={cn(
        "rounded-md px-1.5 py-1 text-surface-500 transition-colors enabled:hover:bg-surface-100 disabled:opacity-40 dark:text-surface-400 dark:enabled:hover:bg-surface-800",
        inline && "px-2",
        active &&
          "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
      )}
      aria-pressed={!!active}
    >
      {label}
    </button>
  );
}
