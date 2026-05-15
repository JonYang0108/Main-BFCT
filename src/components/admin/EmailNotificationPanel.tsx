import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { emailNotificationService } from "@/services/emailNotificationService";
import type {
  NotificationAutomationType,
  NotificationDispatchResult,
  NotificationMessageType,
  NotificationRecipientScope,
  VendorOption,
} from "@/types/domain";

const automationCards: {
  description: string;
  icon: typeof BellRing;
  title: string;
  type: NotificationAutomationType;
}[] = [
  {
    description:
      "Notify vendors with pending balances approaching their due date.",
    icon: BellRing,
    title: "Due Date Reminders",
    type: "due_dates",
  },
  {
    description: "Send the regular monthly rent reminder to active vendors.",
    icon: Mail,
    title: "Rent Reminders",
    type: "rent_reminders",
  },
  {
    description: "Send automated warning notices for overdue vendor balances.",
    icon: ShieldAlert,
    title: "Warnings",
    type: "warnings",
  },
];

function buildSuccessDescription(result: NotificationDispatchResult) {
  const parts = [
    `${result.deliveredNotifications} in-app notification(s) created`,
    `${result.deliveredEmails} email(s) delivered`,
  ];

  if (result.skippedEmails > 0) {
    parts.push(`${result.skippedEmails} email(s) skipped`);
  }

  return parts.join(", ");
}

export default function EmailNotificationPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("compose");
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [open, setOpen] = useState(false);
  const [recipientScope, setRecipientScope] =
    useState<NotificationRecipientScope>("all");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<NotificationMessageType>("system");

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadVendors = async () => {
      setLoadingVendors(true);

      try {
        const data = await emailNotificationService.getAllVendors();
        setVendors(data);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load vendors.";

        toast({
          description: errorMessage,
          title: "Unable to load vendors",
          variant: "destructive",
        });
      } finally {
        setLoadingVendors(false);
      }
    };

    void loadVendors();
  }, [open, toast]);

  const selectedCount = selectedVendorIds.length;

  const selectedVendorSet = useMemo(
    () => new Set(selectedVendorIds),
    [selectedVendorIds],
  );

  const resetForm = () => {
    setActiveTab("compose");
    setRecipientScope("all");
    setSelectedVendorIds([]);
    setTitle("");
    setMessage("");
    setMessageType("system");
  };

  const toggleVendor = (userId: string) => {
    setSelectedVendorIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleClose = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSend = async () => {
    if (!title.trim()) {
      toast({
        description: "A subject is required before sending.",
        title: "Missing title",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        description: "A message is required before sending.",
        title: "Missing message",
        variant: "destructive",
      });
      return;
    }

    if (recipientScope === "specific" && selectedVendorIds.length === 0) {
      toast({
        description: "Select at least one vendor recipient.",
        title: "No recipients selected",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const result = await emailNotificationService.sendManualNotification({
        message: message.trim(),
        recipientScope,
        title: title.trim(),
        type: messageType,
        vendorIds: recipientScope === "specific" ? selectedVendorIds : [],
      });

      toast({
        description: buildSuccessDescription(result),
        title: "Vendor notification sent",
      });

      if (result.warnings.length > 0) {
        toast({
          description: result.warnings.join(" "),
          title: "Delivery warning",
        });
      }

      if (result.errors.length > 0) {
        toast({
          description: result.errors.join(" "),
          title: "Some recipients failed",
          variant: "destructive",
        });
      }

      handleClose(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send notification.";

      toast({
        description: errorMessage,
        title: "Notification failed",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleAutomation = async (
    automationType: NotificationAutomationType,
  ) => {
    setSending(true);

    try {
      const result =
        await emailNotificationService.runAutomation(automationType);

      toast({
        description: buildSuccessDescription(result),
        title: "Automation completed",
      });

      if (result.warnings.length > 0) {
        toast({
          description: result.warnings.join(" "),
          title: "Automation warning",
        });
      }

      if (result.errors.length > 0) {
        toast({
          description: result.errors.join(" "),
          title: "Automation completed with errors",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Automation run failed.";

      toast({
        description: errorMessage,
        title: "Automation failed",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-primary text-primary-foreground gap-2"
      >
        <Mail className="h-4 w-4" />
        Vendor Notifications
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Vendor Email Notifications
            </DialogTitle>
            <DialogDescription>
              Send backend-driven vendor emails and matching in-app
              notifications.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-5">
              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientScope("all");
                      setSelectedVendorIds([]);
                    }}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      recipientScope === "all"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      All Vendors
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Broadcast one message to every active vendor account.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientScope("specific")}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      recipientScope === "specific"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      Specific Vendors
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Target one or more selected vendor recipients.
                    </p>
                  </button>
                </div>
              </div>

              {recipientScope === "specific" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Selected Vendors ({selectedCount})</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedVendorIds(
                            vendors.map((vendor) => vendor.userId),
                          )
                        }
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVendorIds([])}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-border">
                    {loadingVendors ? (
                      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading vendors...
                      </div>
                    ) : vendors.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No approved vendor accounts are available.
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {vendors.map((vendor) => (
                          <label
                            key={vendor.userId}
                            htmlFor={`vendor-${vendor.userId}`}
                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40"
                          >
                            <Checkbox
                              id={`vendor-${vendor.userId}`}
                              checked={selectedVendorSet.has(vendor.userId)}
                              onCheckedChange={() =>
                                toggleVendor(vendor.userId)
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {vendor.fullName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {vendor.email}
                              </p>
                            </div>
                            {vendor.businessName ? (
                              <span className="text-xs text-muted-foreground">
                                {vendor.businessName}
                              </span>
                            ) : null}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="notification-type">Notification Type</Label>
                  <Select
                    value={messageType}
                    onValueChange={(value) =>
                      setMessageType(value as NotificationMessageType)
                    }
                  >
                    <SelectTrigger id="notification-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="payment_due">Due Date</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification-title">Email Subject</Label>
                  <Input
                    id="notification-title"
                    placeholder="Payment Reminder"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-message">Message</Label>
                <Textarea
                  id="notification-message"
                  rows={6}
                  placeholder="Write the vendor notification message..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                These actions run from the backend so they can also be scheduled
                later through Supabase cron or external automation.
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {automationCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <Card key={card.type} className="flex flex-col gap-4 p-5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {card.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="mt-auto gap-2"
                        disabled={sending}
                        onClick={() => handleAutomation(card.type)}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Run Now
                      </Button>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-secondary/20 bg-secondary/10 p-4 text-sm text-secondary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Email delivery requires the backend notification function to be
                configured with `RESEND_API_KEY` and `EMAIL_FROM`. When those
                secrets are missing, the automation still creates in-app
                notifications and returns a warning.
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            {activeTab === "compose" ? (
              <Button
                onClick={handleSend}
                disabled={sending}
                className="bg-gradient-primary text-primary-foreground gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
