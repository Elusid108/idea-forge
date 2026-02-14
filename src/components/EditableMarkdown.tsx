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
      <div className="rounded-lg bg-zinc-900/50 border border-white/5 p-4">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="resize-none text-sm leading-relaxed bg-transparent border-none focus-visible:ring-0 p-0 text-gray-300"
          style={{ minHeight }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group relative cursor-pointer rounded-lg bg-zinc-900/50 border border-white/5 p-4 transition-colors hover:border-white/10"
      style={{ minHeight }}
    >
      <Pencil className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      {value ? (
        <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-gray-300 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-medium">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">{placeholder || "Click to edit…"}</p>
      )}
    </div>
  );
}
