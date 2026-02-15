import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, IndentIncrease } from "lucide-react";

interface RichTextNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const replacement = `${before}${selected || "text"}${after}`;
  const newValue = text.slice(0, start) + replacement + text.slice(end);
  onChange(newValue);
  setTimeout(() => {
    textarea.focus();
    const newStart = start + before.length;
    const newEnd = selected ? newStart + selected.length : newStart + 4;
    textarea.setSelectionRange(newStart, newEnd);
  }, 0);
}

function insertLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end);
  const actualEnd = lineEnd === -1 ? text.length : lineEnd;
  const lines = text.slice(lineStart, actualEnd).split("\n");
  const prefixed = lines.map((line, i) => {
    if (prefix === "1. ") return `${i + 1}. ${line}`;
    return `${prefix}${line}`;
  }).join("\n");
  const newValue = text.slice(0, lineStart) + prefixed + text.slice(actualEnd);
  onChange(newValue);
  setTimeout(() => textarea.focus(), 0);
}

const TOOLBAR_BUTTONS = [
  { icon: Bold, action: "bold", tooltip: "Bold" },
  { icon: Italic, action: "italic", tooltip: "Italic" },
  { icon: Underline, action: "underline", tooltip: "Underline" },
  { icon: Strikethrough, action: "strikethrough", tooltip: "Strikethrough" },
  { icon: List, action: "bullet", tooltip: "Bullet list" },
  { icon: ListOrdered, action: "numbered", tooltip: "Numbered list" },
  { icon: IndentIncrease, action: "indent", tooltip: "Indent" },
];

export default function RichTextNoteEditor({ value, onChange, placeholder }: RichTextNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAction = (action: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    switch (action) {
      case "bold": wrapSelection(ta, "**", "**", onChange); break;
      case "italic": wrapSelection(ta, "*", "*", onChange); break;
      case "underline": wrapSelection(ta, "<u>", "</u>", onChange); break;
      case "strikethrough": wrapSelection(ta, "~~", "~~", onChange); break;
      case "bullet": insertLinePrefix(ta, "- ", onChange); break;
      case "numbered": insertLinePrefix(ta, "1. ", onChange); break;
      case "indent": insertLinePrefix(ta, "  ", onChange); break;
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 border border-border rounded-t-md bg-muted/30 px-1 py-0.5">
        {TOOLBAR_BUTTONS.map(({ icon: Icon, action, tooltip }) => (
          <Button
            key={action}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={tooltip}
            onMouseDown={(e) => { e.preventDefault(); handleAction(action); }}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Write your note…"}
        className="min-h-[120px] resize-none rounded-t-none border-t-0"
      />
    </div>
  );
}
