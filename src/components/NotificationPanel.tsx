import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  CreditCard,
  Info,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

import { notificationService } from "@/services/notificationService";

import type {
  NotificationMessageType,
  NotificationRow,
} from "@/types/domain";

const typeIcons: Record<
  NotificationMessageType,
  ComponentType<{ className?: string }>
> = {
  overdue: AlertTriangle,
  payment_due: Clock,
  system: Info,
  warning: ShieldAlert,
};

const typeColors: Record<NotificationMessageType, string> = {
  overdue: "text-destructive",
  payment_due: "text-secondary",
  system: "text-primary",
  warning: "text-destructive",
};

function isNotificationType(
  value: string,
): value is NotificationMessageType {
  return (
    value === "overdue" ||
    value === "payment_due" ||
    value === "system" ||
    value === "warning"
  );
}

export default function NotificationPanel() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<
    NotificationRow[]
  >([]);

  const [open, setOpen] = useState(false);

  /*
    Stable notification loader.
    React Strict Mode safe.
  */
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      const data =
        await notificationService.getNotifications();

      setNotifications(data);
    } catch (error) {
      console.error(
        "[NotificationPanel] Failed to load notifications:",
        error,
      );
    }
  }, [user]);

  /*
    Initial load + auth-change reload.
  */
  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /*
    Enterprise-safe realtime subscription.
    All realtime lifecycle handled ONLY by the hook.
  */
  useRealtimeRefresh({
  enabled: Boolean(user),
  table: "notifications",
  onRefresh: loadNotifications,
});

  /*
    Memoized unread count.
  */
  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.is_read,
    ).length;
  }, [notifications]);

  /*
    Mark single notification as read.
  */
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error(
        "[NotificationPanel] Failed to mark notification as read:",
        error,
      );
    }
  }, []);

  /*
    Mark all notifications as read.
  */
  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );
    } catch (error) {
      console.error(
        "[NotificationPanel] Failed to mark all notifications as read:",
        error,
      );
    }
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />

          {unreadCount > 0 ? (
            <span
              className="
                absolute
                -right-0.5
                -top-0.5
                flex
                h-4
                w-4
                items-center
                justify-center
                rounded-full
                bg-destructive
                text-[10px]
                font-bold
                text-destructive-foreground
              "
            >
              {unreadCount > 9
                ? "9+"
                : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        align="end"
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-border
            px-4
            py-3
          "
        >
          <h3
            className="
              font-display
              text-sm
              font-semibold
              text-foreground
            "
          >
            Notifications
          </h3>

          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                void markAllRead();
              }}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          ) : null}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div
              className="
                py-8
                text-center
                text-sm
                text-muted-foreground
              "
            >
              <Bell className="mx-auto mb-2 h-8 w-8 opacity-30" />

              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(notifications ?? []).map((notification) => {
                if (!notification) {
                  return null;
                }
                const type = isNotificationType(
                  notification?.type,
                )
                  ? notification.type
                  : "system";

                const Icon =
                  typeIcons[type] ?? CreditCard;

                const color =
                  typeColors[type] ??
                  "text-muted-foreground";

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={`
                      flex
                      w-full
                      gap-3
                      px-4
                      py-3
                      text-left
                      transition-colors
                      hover:bg-muted/50
                      ${
                        !notification.is_read
                          ? "bg-accent/30"
                          : ""
                      }
                    `}
                    onClick={() => {
                      void markAsRead(
                        notification.id,
                      );
                    }}
                  >
                    <Icon
                      className={`
                        mt-0.5
                        h-4
                        w-4
                        shrink-0
                        ${color}
                      `}
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`
                          text-xs
                          font-medium
                          ${
                            !notification.is_read
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        `}
                      >
                        {notification?.title ?? "Untitled notification"}
                      </p>

                      <p
                        className="
                          mt-0.5
                          line-clamp-2
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {notification?.message ?? "No message"}
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          text-muted-foreground
                        "
                      >
                        {notification?.created_at
                          ? new Date(
                              notification.created_at,
                            ).toLocaleDateString()
                          : "Unknown date"}
                      </p>
                    </div>

                    {!notification.is_read ? (
                      <div
                        className="
                          mt-1
                          h-2
                          w-2
                          shrink-0
                          rounded-full
                          bg-primary
                        "
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}