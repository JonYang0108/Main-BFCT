import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Info,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { normalizeAnnouncementStatus } from "@/lib/announcement-utils";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { announcementService } from "@/services/announcementService";
import type { AnnouncementFormValues, AnnouncementRow } from "@/types/domain";

const emptyForm: AnnouncementFormValues = {
  content: "",
  status: "normal",
  title: "",
};

const iconMap = {
  normal: Info,
  urgent: AlertCircle,
  warning: AlertTriangle,
} as const;

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<AnnouncementRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementFormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await announcementService.listAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load announcements.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useRealtimeRefresh({
    channelName: "admin-announcements",
    onRefresh: loadAnnouncements,
    table: "announcements",
  });

  const dialogTitle = useMemo(
    () => (editing ? "Edit Announcement" : "New Announcement"),
    [editing],
  );

  const openCreateDialog = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (announcement: AnnouncementRow) => {
    setEditing(announcement);
    setForm({
      content: announcement.content,
      status: normalizeAnnouncementStatus(announcement),
      title: announcement.title,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({
        description: "Both title and content are required.",
        title: "Missing information",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Add detailed logging for debugging
      console.log("Saving announcement:", { form, editingId: editing?.id });

      const result = await announcementService.saveAnnouncement(
        form,
        user?.id ?? null,
        editing?.id,
      );

      console.log("Announcement saved successfully:", result.status);

      toast({
        title: editing ? "Announcement updated" : "Announcement created",
        description: `Status: ${result.status}`,
      });
      setDialogOpen(false);
      setForm(emptyForm);
      await loadAnnouncements();
    } catch (error) {
      console.error("Failed to save announcement:", error);
      toast({
        description:
          error instanceof Error
            ? error.message
            : "Failed to save announcement.",
        title: "Save failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }

    try {
      await announcementService.deleteAnnouncement(deleting.id);
      toast({ title: "Announcement deleted" });
      setDeleteDialogOpen(false);
      setDeleting(null);
      await loadAnnouncements();
    } catch (error) {
      toast({
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete announcement.",
        title: "Delete failed",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Announcements
            </h1>
            <p className="text-sm text-muted-foreground">
              Publish important marketplace updates and prioritize urgent
              notices.
            </p>
          </div>

          <Button
            onClick={openCreateDialog}
            className="bg-gradient-primary text-primary-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : errorMessage ? (
          <Card className="p-8 text-center text-sm text-destructive">
            {errorMessage}
          </Card>
        ) : announcements.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground shadow-card">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>No announcements yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const status = normalizeAnnouncementStatus(announcement);
              const Icon = iconMap[status];

              return (
                <Card key={announcement.id} className="p-5 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-semibold text-foreground">
                            {announcement.title}
                          </h3>
                          <AnnouncementStatusBadge
                            status={announcement.status}
                            type={announcement.type}
                          />
                        </div>

                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {announcement.content}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {new Date(announcement.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleting(announcement);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcement-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as AnnouncementFormValues["status"],
                    }))
                  }
                >
                  <SelectTrigger id="announcement-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>


                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-content">Content</Label>
              <Textarea
                id="announcement-content"
                rows={5}
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-primary text-primary-foreground"
            >
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Delete "{deleting?.title}" permanently?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
