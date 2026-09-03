import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Check,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useDocumentationStore } from "@/lib/stores/documentationStore";
import { countWords, cn } from "@/lib/utils";
import type { SectionStatus } from "@/types";

const AUTOSAVE_DELAY_MS = 800;

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
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({
        placeholder: "",
      }),
    ],
    content: "",
    editorProps: { attributes: { class: "focus:outline-none" } },
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

  // Insert AI-generated content when signaled from the AI panel
  useEffect(() => {
    if (!editor || !pendingInsertHtml) return;
    editor
      .chain()
      .focus()
      .insertContent(`<p><br></p><p>${pendingInsertHtml.replace(/<p>/g, "").replace(/<\/p>/g, "</p><p>")}</p>`)
      .run();
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
      <div className="flex items-center gap-1 border-b border-surface-200 px-5 py-2 dark:border-surface-800">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          label={<Bold className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          label={<Italic className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor?.isActive("heading", { level: 2 })}
          label={<Heading2 className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor?.isActive("heading", { level: 3 })}
          label={<Heading3 className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          label={<List className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
          label={<ListOrdered className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          label={<Quote className="h-3.5 w-3.5" />}
        />
        <Badge tone="neutral" className="ml-auto tabular-nums">
          {words.toLocaleString()} words
        </Badge>
      </div>

      {/* Editor surface */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      data-active={active}
      className={cn(
        "rounded-md p-1.5 text-surface-500 transition-colors hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800",
        active &&
          "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
      )}
      aria-pressed={!!active}
    >
      {label}
    </button>
  );
}
