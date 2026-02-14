import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{reference.title}</DialogTitle>
            <DialogDescription className="sr-only">Note details</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {reference.description || "No content"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (reference.type === "image") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl p-0 bg-black/95 border-none [&>button]:text-white [&>button]:hover:opacity-100">
          <DialogHeader className="sr-only">
            <DialogTitle>{reference.title}</DialogTitle>
            <DialogDescription>Image viewer</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <img
              src={reference.url || ""}
              alt={reference.title}
              className="max-w-full max-h-[85vh] object-contain"
            />
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
        <DialogContent className="sm:max-w-4xl p-0 bg-black/95 border-none [&>button]:text-white [&>button]:hover:opacity-100">
          <DialogHeader className="sr-only">
            <DialogTitle>{reference.title}</DialogTitle>
            <DialogDescription>Video viewer</DialogDescription>
          </DialogHeader>
          <div className="aspect-video">
            {ytId ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            ) : vimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            ) : (
              <video src={url} controls autoPlay className="w-full h-full" />
            )}
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
  if (vimeoId) return null; // Vimeo needs API call, use placeholder
  return null;
}
