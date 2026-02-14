import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

interface EditableMarkdownProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  placeholder?: string;
  minHeight?: string;
}

export default function EditableMarkdown({ value, onChange, onSave, placeholder, minHeight = "80px" }: EditableMarkdownProps) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    onSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditing(false);
      onSave();
    }
  };

  if (editing) {
    return (
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="resize-none text-sm"
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group relative cursor-pointer rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-muted/30"
      style={{ minHeight }}
    >
      <Pencil className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      {value ? (
        <div className="prose prose-sm max-w-none text-sm text-foreground [&_ul]:mt-1 [&_ul]:mb-1 [&_ol]:mt-1 [&_ol]:mb-1 [&_li]:my-0 [&_p]:my-1 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-medium">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">{placeholder || "Click to edit…"}</p>
      )}
    </div>
  );
}
