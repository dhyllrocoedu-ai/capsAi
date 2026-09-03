import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function DynamicFieldList({
  label,
  items,
  onChange,
  placeholder = "",
  allowEmpty = false,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!allowEmpty && items.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...items, trimmed]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-surface-600 dark:text-surface-300">
        {label}
      </label>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={`${item}-${idx}`} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                onChange(next);
              }}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              aria-label={`Remove ${item}`}
              className="rounded-md p-2 text-surface-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <p className="py-3 text-center text-xs text-surface-400">No items yet.</p>
        )}
      </ul>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
        />
        <Button type="submit" variant="secondary" size="sm" aria-label="Add">
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}