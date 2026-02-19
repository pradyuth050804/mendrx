// File: src/app/reports/ReportsClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useSession } from "@/hooks/useSession";
import { SearchClient } from "@/components/SearchClient";
import { createAuthClient, AuthClient } from "@/lib/supabase-auth";
import { toast } from "react-hot-toast";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useUserData } from "@/contexts/UserContext";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
interface Report {
  id: string;
  clientId: string;
  clientName: string;
  gender: string;
  ageOnReportDate: number;
  reportDate: string;
  updatedAt: string;
}

interface PaginatedResponse {
  content: Report[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

const getApiUrl = () => {
  switch (process.env.NEXT_PUBLIC_ENV) {
    case "production":
      return process.env.NEXT_PUBLIC_PROD_API_URL;
    case "development":
      return process.env.NEXT_PUBLIC_DEV_API_URL;
    default:
      return process.env.NEXT_PUBLIC_LOCAL_API_URL;
  }
};

const ReportsClient = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(
    new Set()
  );
  const [showDifferentClientDialog, setShowDifferentClientDialog] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const searchParams = useSearchParams();
  const [initialClientName, setInitialClientName] = useState<string>("");
  const [pendingCompareReports, setPendingCompareReports] = useState<string[]>(
    []
  );

  const router = useRouter();
  const { session, isLoading: authLoading } = useSession();
  const authClient: AuthClient = createAuthClient();
  const { userData } = useUserData();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const session = await authClient.auth.getSession();
      if (!session.data.session) {
        router.push("/");
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/reports/batch-delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          reportIds: Array.from(selectedReports),
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to delete reports");
      }

      toast.success(
        `Successfully deleted ${selectedReports.size} report${
          selectedReports.size !== 1 ? "s" : ""
        }`
      );
      setSelectedReports(new Set());
      fetchReports(currentPage);
    } catch (error) {
      console.error("Error deleting reports:", error);
      toast.error("Failed to delete reports. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const fetchReports = async (page: number, searchValue?: string) => {
    if (!session?.access_token) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl();
      const searchParams = new URLSearchParams({
        page: page.toString(),
        size: "10",
        sortBy: "updatedAt",
        sortDirection: "desc",
      });

      // Use the passed searchValue instead of the state
      if (searchValue !== undefined) {
        setSearchTerm(searchValue); // Update the state
        if (searchValue) {
          searchParams.append("clientSearch", searchValue);
        }
      } else if (searchTerm) {
        // Use existing searchTerm for pagination
        searchParams.append("clientSearch", searchTerm);
      }

      const response = await fetch(
        `${apiUrl}/reports/metadata?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setReports(result.data.content);
        setCurrentPage(result.data.pageNumber);
        setTotalPages(result.data.totalPages);
      } else {
        throw new Error(result.message || "Failed to fetch reports");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const clientName = searchParams.get("clientName");

    if (clientName) {
      setSearchTerm(clientName);
      setInitialClientName(clientName);
      fetchReports(0, clientName);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && session) {
      fetchReports(0);
    }
  }, [session, authLoading]);

  const formatReportDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formattedDate = formatter.format(date);
    const dayNum = date.getDate();
    const daySuffix = ["st", "nd", "rd"][(dayNum % 10) - 1] || "th";
    return formattedDate.replace(/(\d+)/, `$1${daySuffix}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    const formatter = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formattedDate = formatter.format(date);
    const dayNum = date.getDate();
    const daySuffix = ["st", "nd", "rd"][(dayNum % 10) - 1] || "th";
    const finalDate = formattedDate.replace(/(\d+)/, `$1${daySuffix}`);

    let timeAgo = "";
    if (years > 0) {
      timeAgo += `${years} year${years > 1 ? "s" : ""} `;
    }
    if (months > 0) {
      timeAgo += `${months} month${months > 1 ? "s" : ""} `;
    }
    if (days > 0) {
      timeAgo += `${days} day${days > 1 ? "s" : ""} `;
    }
    if (days == 0) {
      timeAgo += "today";
    } else {
      timeAgo += "ago";
    }

    return `${finalDate} (${timeAgo})`;
  };

  const handlePageChange = (page: number) => {
    fetchReports(page, undefined);
  };

  const handleViewReport = (reportId: string) => {
    router.push(`/reports/${reportId}`);
  };

  const handleSearch = (value: string) => {
    fetchReports(0, value);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          onClick={() => handlePageChange(0)}
          isActive={currentPage === 0}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (currentPage > maxVisiblePages - 3) {
      items.push(
        <PaginationItem key="ellipsis1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Show pages around current page
    for (
      let i = Math.max(1, currentPage - 1);
      i <= Math.min(totalPages - 2, currentPage + 1);
      i++
    ) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
          >
            {i + 1}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (currentPage < totalPages - (maxVisiblePages - 2)) {
      items.push(
        <PaginationItem key="ellipsis2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            onClick={() => handlePageChange(totalPages - 1)}
            isActive={currentPage === totalPages - 1}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  const handleReportSelection = (reportId: string, clientId: string) => {
    setSelectedReports((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(reportId)) {
        newSelection.delete(reportId);
      } else if (newSelection.size < 4) {
        newSelection.add(reportId);
      }
      return newSelection;
    });
  };

  const handleCompareClick = async () => {
    const selectedReportsList = Array.from(selectedReports);

    // Check if reports belong to different clients
    const selectedReportDetails = selectedReportsList
      .map((id) => reports.find((r) => r.id === id))
      .filter((r): r is Report => r !== undefined);

    const uniqueClients = new Set(selectedReportDetails.map((r) => r.clientId));

    if (uniqueClients.size > 1) {
      setPendingCompareReports(selectedReportsList);
      setShowDifferentClientDialog(true);
      return;
    }

    await initiateComparison(selectedReportsList);
  };

  const initiateComparison = async (reportIds: string[]) => {
    // Remove the API call from here since we'll do it server-side
    router.push(`/reports/comparison?reports=${reportIds.join(",")}`);
    setCompareLoading(false);
    setShowDifferentClientDialog(false);
  };

  const clearSelection = () => {
    setSelectedReports(new Set());
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="mr-2" size={16} />
              Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                RCA Reports
              </h1>
              {selectedReports.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedReports.size} report
                    {selectedReports.size !== 1 ? "s" : ""} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {selectedReports.size > 0 && (
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="w-full sm:w-auto border-red-600 hover:bg-red-50 text-red-600 hover:text-red-700 order-2 sm:order-1"
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                    Delete Selected
                  </>
                )}
              </Button>
            )}

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto order-1 sm:order-2">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full sm:w-auto">
                      <Button
                        disabled={
                          selectedReports.size < 2 ||
                          !(userData?.parentDTO?.comparisonEnabled ?? false)
                        }
                        onClick={handleCompareClick}
                        className="w-full sm:w-auto"
                        variant="default"
                      >
                        {compareLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        ) : (
                          "Compare Selected"
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {selectedReports.size < 2 && (
                    <TooltipContent>
                      <p>Select minimum 2 reports to compare</p>
                    </TooltipContent>
                  )}
                  {userData && !userData.parentDTO?.comparisonEnabled && (
                    <TooltipContent>
                      <p>Comparison is not enabled for your academy</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <div className="w-full sm:w-auto">
                <SearchClient
                  onSearch={handleSearch}
                  authToken={session?.access_token || ""}
                  apiUrl={getApiUrl()}
                  initialValue={initialClientName}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table View (hidden on mobile) */}
        <div className="hidden sm:block bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Age(On Report Date)</TableHead>
                <TableHead>Report Date</TableHead>
                <TableHead>RCA Updated Date</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || authLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : reports && reports.length > 0 ? (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <input
                                type="checkbox"
                                checked={selectedReports.has(report.id)}
                                onChange={() =>
                                  handleReportSelection(
                                    report.id,
                                    report.clientId
                                  )
                                }
                                disabled={
                                  !selectedReports.has(report.id) &&
                                  selectedReports.size >= 4
                                }
                                className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed hover:cursor-pointer"
                              />
                            </span>
                          </TooltipTrigger>
                          {!selectedReports.has(report.id) &&
                            selectedReports.size >= 4 && (
                              <TooltipContent
                                side="right"
                                className="bg-white text-gray-900 border border-gray-200"
                              >
                                <p className="text-sm">
                                  Maximum 4 reports can be selected for
                                  comparison
                                </p>
                              </TooltipContent>
                            )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-left">
                      {report.clientName}
                    </TableCell>
                    <TableCell className="text-left capitalize">
                      {report.gender?.toLowerCase() || "N/A"}
                    </TableCell>
                    <TableCell>{report.ageOnReportDate} years</TableCell>
                    <TableCell>{formatReportDate(report.reportDate)}</TableCell>
                    <TableCell>{formatDate(report.updatedAt)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        onClick={() => handleViewReport(report.id)}
                        variant="outline"
                        className="border-blue-500 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Report
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No reports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View (shown only on mobile) */}
        <div className="sm:hidden space-y-4">
          {isLoading || authLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : reports && reports.length > 0 ? (
            reports.map((report) => (
              <Card key={report.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{report.clientName}</h3>
                      <div className="text-sm text-gray-500 capitalize">
                        {report.gender?.toLowerCase() || "N/A"},{" "}
                        {report.ageOnReportDate} years
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.id)}
                        onChange={() =>
                          handleReportSelection(report.id, report.clientId)
                        }
                        disabled={
                          !selectedReports.has(report.id) &&
                          selectedReports.size >= 4
                        }
                        className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 mb-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <div className="text-sm">
                        <span className="text-gray-500">Report Date: </span>
                        {formatReportDate(report.reportDate)}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <div className="text-sm">
                        <span className="text-gray-500">RCA Date: </span>
                        {formatDate(report.updatedAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-4 py-3 bg-gray-50 flex justify-center">
                  <Button
                    onClick={() => handleViewReport(report.id)}
                    variant="default"
                    className="w-full"
                    size="sm"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Report
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 bg-white rounded-lg shadow">
              No reports found
            </div>
          )}
        </div>
      </main>

      <AlertDialog
        open={showDifferentClientDialog}
        onOpenChange={setShowDifferentClientDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Different Clients Selected</AlertDialogTitle>
            <AlertDialogDescription>
              The selected reports belong to different clients. Are you sure you
              want to proceed with the comparison?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => initiateComparison(pendingCompareReports)}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteSelected}
        selectedCount={selectedReports.size}
      />
    </div>
  );
};

export default ReportsClient;
