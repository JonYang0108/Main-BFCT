import { getCurrentUser, supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type { AppRole } from "@/types/domain";

export type ConversationRoleSender =
    | { role: "vendor"; userId: string }
    | { role: "admin" | "staff"; userId: string };

export type NotificationConversationListRow = {
    conversation_id: string;
    vendor_id: string;
    related_entity_id: string | null;
    status: string;
    updated_at: string;
    created_at: string;
    latest_message_id: string | null;
    latest_message_content: string | null;
    latest_message_sender_role: AppRole | null;
    latest_message_sender_user_id: string | null;
    latest_message_created_at: string | null;
    unread_count: number;
};

export type NotificationMessageRow = {
    id: string;
    conversation_id: string;
    sender_role: AppRole;
    sender_user_id: string;
    content: string;
    created_at: string;
    message_dedupe_key: string | null;
};

async function requireUserId(): Promise<string> {
    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in.");
    return user.id;
}

export const conversationNotificationService = {
    async listConversations(params: {
        search?: string;
        onlyUnread?: boolean;
        limit?: number;
    } = {}): Promise<NotificationConversationListRow[]> {
        type Row = NotificationConversationListRow;

        // Supabase schema typings in this repo don't include the view `v_notification_conversations_list`.
        // Route this through an RPC (Edge/SQL function) that returns the same projection.
        // If your DB function name differs, update `fn_conversations_list`.
        const { data, error } = await (supabase as unknown as {
            rpc: (
                fn: string,
                args: {
                    _search?: string | null;
                    _only_unread?: boolean;
                    _limit?: number | null;
                },
            ) => Promise<{ data: unknown; error: unknown }>;
        }).rpc("fn_conversations_list", {
            _search: params.search?.trim() || null,
            _only_unread: params.onlyUnread ?? false,
            _limit: params.limit ?? null,
        });

        if (error) throw toAppError(error, "Unable to load conversations.");

        return (data ?? []) as Row[];
    },

    async getMessages(
        params: { conversationId: string; limit?: number },
    ): Promise<NotificationMessageRow[]> {
        await requireUserId();
        const limit = params.limit ?? 200;

        const { data, error } = await (supabase as unknown as {
            from: (table: string) => {
                select: (columns: string) => {
                    eq: (col: string, value: string) => {
                        order: (col: string, opts: { ascending: boolean }) => {
                            limit: (
                                n: number,
                            ) => Promise<{ data: unknown; error: unknown }>;
                        };
                    };
                };
            };
        })
            .from("notification_messages")
            .select(
                "id,conversation_id,sender_role,sender_user_id,content,created_at,message_dedupe_key",
            )
            .eq("conversation_id", params.conversationId)
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) {
            throw toAppError(error, "Unable to load conversation messages.");
        }

        return (data ?? []) as NotificationMessageRow[];
    },

    async createConversationWithFirstMessage(params: {
        vendorId: string;
        relatedEntityId?: string | null;
        title?: string;
        content: string;
        messageDedupeKey?: string;
    }): Promise<{ conversationId: string }> {
        const userId = await requireUserId();

        const { data: conv, error: convErr } = await (supabase as unknown as {
            from: (table: string) => {
                insert: (values: unknown) => {
                    select: (columns: string) => {
                        single: () => Promise<
                            { data: unknown; error: unknown }
                        >;
                    };
                };
            };
        })
            .from("notification_conversations")
            .insert({
                vendor_id: params.vendorId,
                related_entity_id: params.relatedEntityId ?? null,
                status: "open",
            })
            .select("id")
            .single();

        if (convErr) {
            throw toAppError(convErr, "Unable to create conversation.");
        }

        const convId = (conv as { id: string } | null)?.id;
        if (!convId) throw new Error("Unable to determine conversation id.");

        const content = params.title
            ? `${params.title}\n\n${params.content}`
            : params.content;

        const { error: msgErr } = await (supabase as unknown as {
            from: (table: string) => {
                insert: (
                    values: unknown,
                ) => Promise<{ data: unknown; error: unknown }>;
            };
        })
            .from("notification_messages")
            .insert({
                conversation_id: convId,
                sender_role: "vendor" as AppRole,
                sender_user_id: userId,
                content,
                message_dedupe_key: params.messageDedupeKey ?? null,
            });

        if (msgErr) throw toAppError(msgErr, "Unable to send first message.");

        return { conversationId: convId };
    },

    async sendReply(params: {
        conversationId: string;
        senderRole: "admin" | "staff";
        content: string;
        messageDedupeKey?: string;
    }): Promise<void> {
        const userId = await requireUserId();

        const { error } = await (supabase as unknown as {
            from: (table: string) => {
                insert: (
                    values: unknown,
                ) => Promise<{ data: unknown; error: unknown }>;
            };
        })
            .from("notification_messages")
            .insert({
                conversation_id: params.conversationId,
                sender_role: params.senderRole as AppRole,
                sender_user_id: userId,
                content: params.content,
                message_dedupe_key: params.messageDedupeKey ?? null,
            });

        if (error) throw toAppError(error, "Unable to send reply.");
    },

    async markConversationRead(params: {
        conversationId: string;
    }): Promise<void> {
        const userId = await requireUserId();

        const { error } = await (supabase as unknown as {
            rpc: (
                fn: string,
                args: unknown,
            ) => Promise<{ data: unknown; error: unknown }>;
        }).rpc("fn_mark_conversation_read", {
            _conversation_id: params.conversationId,
            _user_id: userId,
        });

        if (error) throw toAppError(error, "Unable to mark as read.");
    },

    subscribeToConversationsList(params: { onChange: () => void }): {
        unsubscribe: () => void;
    } {
        const channel = supabase
            .channel(`notification-conversations-list-${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notification_messages",
                },
                () => {
                    params.onChange();
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notification_conversations",
                },
                () => {
                    params.onChange();
                },
            )
            .subscribe();

        return {
            unsubscribe: () => {
                void supabase.removeChannel(channel);
            },
        };
    },

    subscribeToConversationMessages(params: {
        conversationId: string;
        onNewMessage: (message: NotificationMessageRow) => void;
    }): { unsubscribe: () => void } {
        type Payload = { new?: NotificationMessageRow };

        const channel = supabase
            .channel(
                `notification-conversation-messages-${params.conversationId}`,
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notification_messages",
                    filter: `conversation_id=eq.${params.conversationId}`,
                },
                (payload: Payload) => {
                    const msg = payload.new;
                    if (!msg) return;
                    params.onNewMessage(msg);
                },
            )
            .subscribe();

        return {
            unsubscribe: () => {
                void supabase.removeChannel(channel);
            },
        };
    },
};
