import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Pencil } from "lucide-react";
import RichTextNoteEditor from "@/components/RichTextNoteEditor";
import { markdownComponents } from "@/lib/markdownComponents";

interface EditableMarkdownProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

// Simple markdown-to-HTML converter for editing
function markdownToHtml(md: string): string {
  if (!md) return "";
  let html = md;
  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  html = html.replace(/\*(.+?)\*/g, "<i>$1</i>");
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  // Line breaks for remaining lines
  html = html.replace(/\n/g, "<br>");
  return html;
}

// Simple HTML-to-markdown converter for saving
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  let md = html;
  // Remove wrapping tags
  md = md.replace(/<h1>(.*?)<\/h1>/gi, "# $1\n");
  md = md.replace(/<h2>(.*?)<\/h2>/gi, "## $1\n");
  md = md.replace(/<h3>(.*?)<\/h3>/gi, "### $1\n");
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<u>(.*?)<\/u>/gi, "$1");
  md = md.replace(/<strike>(.*?)<\/strike>/gi, "~~$1~~");
  md = md.replace(/<s>(.*?)<\/s>/gi, "~~$1~~");
  md = md.replace(/<ul>(.*?)<\/ul>/gis, "$1");
  md = md.replace(/<ol>(.*?)<\/ol>/gis, "$1");
  md = md.replace(/<li>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<div>(.*?)<\/div>/gi, "$1\n");
  md = md.replace(/<p>(.*?)<\/p>/gi, "$1\n");
  md = md.replace(/<[^>]*>/g, "");
  md = md.replace(/&nbsp;/g, " ");
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  // Clean up extra newlines
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

export default function EditableMarkdown({ value, onChange, onSave, placeholder, minHeight = "80px", readOnly }: EditableMarkdownProps) {
  const [editing, setEditing] = useState(false);
  const [htmlValue, setHtmlValue] = useState("");

  useEffect(() => {
    if (editing) {
      setHtmlValue(markdownToHtml(value));
    }
  }, [editing]);

  const handleBlur = () => {
    // This is handled by the RichTextNoteEditor internally
  };

  const handleDone = () => {
    const md = htmlToMarkdown(htmlValue);
    onChange(md);
    setEditing(false);
    // Use setTimeout to ensure state is updated before saving
    setTimeout(() => onSave(), 0);
  };

  if (editing && !readOnly) {
    return (
      <div className="rounded-lg bg-zinc-900/50 border border-white/5 p-4 space-y-2">
        <RichTextNoteEditor
          value={htmlValue}
          onChange={setHtmlValue}
          placeholder={placeholder}
        />
        <div className="flex justify-end">
          <button
            onClick={handleDone}
            className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => !readOnly && setEditing(true)}
      className={`group relative rounded-lg bg-zinc-900/50 border border-white/5 p-4 transition-colors ${!readOnly ? "cursor-pointer hover:border-white/10" : ""}`}
      style={{ minHeight }}
    >
      {!readOnly && (
        <Pencil className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      {value ? (
        <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-gray-300 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-medium">
          <ReactMarkdown components={markdownComponents}>{value}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">{placeholder || "Click to edit…"}</p>
      )}
    </div>
  );
}
