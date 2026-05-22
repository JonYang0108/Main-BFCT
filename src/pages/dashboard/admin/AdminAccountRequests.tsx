import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Image,
  Search,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { accountRequestServiceV2 } from "@/services/accountRequestService_v2";
import { fileService } from "@/services/fileService";
import { useNavigate } from "react-router-dom";
import type { AccountRequestRecord, VendorRequestStatus } from "@/types/domain";
const statusStyles: Record<VendorRequestStatus, string> = {
  approved: "border-primary/20 bg-primary/10 text-primary",
  declined: "border-destructive/20 bg-destructive/10 text-destructive",
  pending: "border-secondary/20 bg-secondary/10 text-secondary",
};

function RequestStatusBadge({ status }: { status: VendorRequestStatus | null | undefined }) {
  const safeStatus = status ?? "pending";
  if (safeStatus === "approved") {
    return (
      <Badge variant="outline" className={statusStyles.approved}>
        <CheckCircle className="mr-1 h-3 w-3" />
        Approved
      </Badge>
    );
  }

  if (safeStatus === "declined") {
    return (
      <Badge variant="outline" className={statusStyles.declined}>
        <XCircle className="mr-1 h-3 w-3" />
        Declined
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={statusStyles.pending}>
      <Clock className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  );
}

export default function AdminAccountRequests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccountRequestRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<AccountRequestRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<VendorRequestStatus | "all">(
    "pending",
  );
  const [viewOpen, setViewOpen] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setRequests(await accountRequestServiceV2.listAccountRequests());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load account requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useRealtimeRefresh({
    channelName: "account-requests",
    onRefresh: loadRequests,
    table: "vendor_requests",
  });

  useRealtimeRefresh({
    channelName: "account-request-profiles",
    onRefresh: loadRequests,
    table: "profiles",
  });

  useRealtimeRefresh({
    channelName: "account-request-ids",
    onRefresh: loadRequests,
    table: "user_valid_ids",
  });

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        (request.full_name ?? "").toLowerCase().includes(query) ||
        (request.email ?? "").toLowerCase().includes(query)
      );
    });
  }, [requests, search, statusFilter]);

  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  const handleApprove = async (request: AccountRequestRecord) => {
  setProcessingId(request.id);

  try {
    await accountRequestServiceV2.approveAccountRequest(request.id);
    
    toast({
      title: "✅ Account Approved",
      description: `${request.full_name} is now active. Redirecting...`,
    });

    // Wait a brief moment for DB sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reload requests
    await loadRequests();

    // Redirect to vendor management after 1.5 seconds
    setTimeout(() => {
      navigate("/dashboard/admin/vendors");
    }, 500);

  } catch (error) {
    toast({
      description:
        error instanceof Error ? error.message : "Failed to approve request.",
      title: "❌ Approval Failed",
      variant: "destructive",
    });
    console.error("Approval error:", error);
  } finally {
    setProcessingId(null);
    setViewOpen(false);
  }
};

  const handleDecline = async () => {
    if (!selectedRequest) {
      return;
    }

    if (!declineReason.trim()) {
      toast({
        description: "A decline reason is required.",
        title: "Missing reason",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(selectedRequest.id);

    try {
      await accountRequestServiceV2.declineAccountRequest(
        selectedRequest.id,
        declineReason,
      );
      toast({
        title: "Account request declined",
        description: `${selectedRequest.full_name}'s request was declined.`,
      });
      setDeclineReason("");
      setDeclineOpen(false);
      setViewOpen(false);
      setSelectedRequest(null);
      await loadRequests();
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : "Failed to decline request.",
        title: "Decline failed",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openFileUrl = async (storagePath: string) => {
    try {
      const url = await fileService.getValidIdUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        description:
          error instanceof Error
            ? error.message
            : "Unable to open the uploaded ID.",
        title: "File unavailable",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Account Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Review vendor account creation requests and approve or reject them.
          </p>
        </div>

        <Card className="space-y-4 p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as VendorRequestStatus | "all")
              }
            >
              <TabsList>
                <TabsTrigger value="pending" className="gap-1">
                  Pending
                  {pendingCount > 0 ? (
                    <span className="rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">
                      {pendingCount}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="declined">Declined</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <UserCheck className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>
                No {statusFilter === "all" ? "" : statusFilter} account requests
                found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.full_name}
                      </TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{request.validIds?.length ?? 0}</TableCell>
                      <TableCell>
                        <RequestStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRequest(request);
                              setViewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {request.status === "pending" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary"
                                disabled={processingId === request.id}
                                onClick={() => handleApprove(request)}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  setDeclineReason("");
                                  setSelectedRequest(request);
                                  setDeclineOpen(true);
                                }}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest ? (
            <div className="space-y-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">
                    {selectedRequest.full_name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{selectedRequest.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Birthdate:</span>{" "}
                  <span className="font-medium">
                    {selectedRequest.profile?.birthdate || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Contact:</span>{" "}
                  <span className="font-medium">
                    {selectedRequest.profile?.contact_number ||
                      selectedRequest.profile?.phone ||
                      selectedRequest.phone ||
                      "-"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Address:</span>{" "}
                  <span className="font-medium">
                    {selectedRequest.profile?.address ||
                      selectedRequest.address ||
                      "-"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <RequestStatusBadge status={selectedRequest.status} />
                </div>
                {selectedRequest.decline_reason ? (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">
                      Decline Reason:
                    </span>{" "}
                    <span className="font-medium text-destructive">
                      {selectedRequest.decline_reason}
                    </span>
                  </div>
                ) : null}
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  Uploaded Valid IDs
                </h4>

                {selectedRequest.validIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No IDs uploaded.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedRequest.validIds.map((validId) => (
                      <button
                        key={validId.id}
                        type="button"
                        onClick={() => openFileUrl(validId.storage_path)}
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left transition-colors hover:bg-muted/60"
                      >
                        {validId.file_type.startsWith("image/") ? (
                          <Image className="h-5 w-5 shrink-0 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 shrink-0 text-primary" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {validId.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click to view
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedRequest.status === "pending" ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1 bg-gradient-primary text-primary-foreground"
                    disabled={processingId === selectedRequest.id}
                    onClick={() => handleApprove(selectedRequest)}
                  >
                    <UserCheck className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setDeclineReason("");
                      setDeclineOpen(true);
                    }}
                  >
                    <UserX className="mr-1 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Account Request</DialogTitle>
            <DialogDescription>
              Provide a clear reason for declining {selectedRequest?.full_name}
              &apos;s vendor request.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={4}
            placeholder="Enter the reason for declining this request..."
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !declineReason.trim() || processingId === selectedRequest?.id
              }
              onClick={handleDecline}
            >
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
