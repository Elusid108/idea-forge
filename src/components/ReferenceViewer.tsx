import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { addTargetBlankToHtml } from "@/lib/markdownComponents";

interface Reference {
  id: string;
  type: string;
  title: string;
  url?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
}

interface ReferenceViewerProps {
  reference: Reference | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export default function ReferenceViewer({ reference, open, onOpenChange }: ReferenceViewerProps) {
  if (!reference) return null;

  if (reference.type === "note") {
    const content = reference.description || "No content";
    const hasHtml = /<[a-z][\s\S]*>/i.test(content);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{reference.title}</DialogTitle>
            <DialogDescription className="sr-only">Note details</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {hasHtml ? (
              <div className="text-sm text-muted-foreground prose prose-invert prose-sm max-w-none [&_li]:my-1 [&_ul]:my-2 [&_ol]:my-2 [&_p]:my-2" dangerouslySetInnerHTML={{ __html: addTargetBlankToHtml(content) }} />
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (reference.type === "image") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl p-0 bg-black/95 border-none [&>button]:text-white [&>button]:hover:opacity-100 [&>button]:top-2 [&>button]:right-2 [&>button]:z-10">
          <DialogHeader className="sr-only">
            <DialogTitle>{reference.title}</DialogTitle>
            <DialogDescription>Image viewer</DialogDescription>
          </DialogHeader>
          <div className="pt-10 pb-4 px-4">
            <div className="flex items-center justify-center min-h-[50vh]">
              <img
                src={reference.url || ""}
                alt={reference.title}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
            {reference.description && (
              <p className="text-sm text-gray-400 text-center mt-3 px-4">{reference.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (reference.type === "video") {
    const url = reference.url || "";
    const ytId = getYouTubeId(url);
    const vimeoId = getVimeoId(url);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl p-0 bg-black/95 border-none [&>button]:text-white [&>button]:hover:opacity-100 [&>button]:top-2 [&>button]:right-2 [&>button]:z-10">
          <DialogHeader className="sr-only">
            <DialogTitle>{reference.title}</DialogTitle>
            <DialogDescription>Video viewer</DialogDescription>
          </DialogHeader>
          <div className="pt-10 pb-4 px-4">
            <div className="aspect-video">
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                  className="w-full h-full rounded"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : vimeoId ? (
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                  className="w-full h-full rounded"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video src={url} controls autoPlay className="w-full h-full rounded" />
              )}
            </div>
            {reference.description && (
              <p className="text-sm text-gray-400 text-center mt-3 px-4">{reference.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (reference.type === "widget") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl p-0 bg-background border [&>button]:top-2 [&>button]:right-2 [&>button]:z-10">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle>{reference.title}</DialogTitle>
            <DialogDescription className="sr-only">Widget viewer</DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-4">
            <iframe
              srcDoc={reference.description || ""}
              sandbox="allow-scripts"
              className="w-full border rounded"
              style={{ height: "70vh" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

// Utility: extract video thumbnail
export function getVideoThumbnail(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return null;
  return null;
}
