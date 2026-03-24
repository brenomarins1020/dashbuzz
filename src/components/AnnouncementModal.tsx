import { useAnnouncements, type Announcement } from "@/hooks/useAnnouncements";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLE_CONFIG: Record<Announcement["style"], { icon: React.ElementType; border: string; iconColor: string }> = {
  info: { icon: Info, border: "border-l-4 border-l-primary", iconColor: "text-primary" },
  warning: { icon: AlertTriangle, border: "border-l-4 border-l-yellow-500", iconColor: "text-yellow-500" },
  urgent: { icon: AlertCircle, border: "border-l-4 border-l-destructive", iconColor: "text-destructive" },
};

export function AnnouncementModal() {
  const { unread, markAsRead } = useAnnouncements();

  // Show the highest-priority unread announcement
  const current = unread[0] ?? null;
  if (!current) return null;

  const config = STYLE_CONFIG[current.style] || STYLE_CONFIG.info;
  const Icon = config.icon;

  const handleAck = () => markAsRead(current.id);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !current.require_ack) handleAck(); }}>
      <DialogContent className={cn("sm:max-w-md", config.border)}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5 shrink-0", config.iconColor)} />
            <DialogTitle className="font-heading text-lg">{current.title}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {current.message}
        </DialogDescription>
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={handleAck} className="flex-1">
            Entendi
          </Button>
          {current.link_url && (
            <Button variant="outline" asChild>
              <a href={current.link_url} target="_blank" rel="noreferrer" className="gap-1.5">
                Saiba mais <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
