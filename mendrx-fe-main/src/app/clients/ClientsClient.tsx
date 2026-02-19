// File: src/app/clients/ClientsClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useSession } from "@/hooks/useSession";
import { SearchClient } from "@/components/SearchClient";
import { createAuthClient } from "@/lib/supabase-auth";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Eye,
  Edit2,
  Plus,
  // FileText, // Removed unused import
  ChevronRight,
  ChevronLeft,
  Trash2,
  User, // Added for mobile card
  Calendar, // Added for mobile card
  Phone, // Added for mobile card
  Mail, // Added for mobile card
  Loader2, // Added for loading states
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ClientDialog from "./ClientDialog";
import DeleteClientDialog from "./DeleteClientDialog";

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
  // PaginationNext, // Using Button instead
  // PaginationPrevious, // Using Button instead
} from "@/components/ui/pagination";
import { Card, CardContent, CardFooter } from "@/components/ui/card"; // Added for mobile view

interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  birthMonth: string; // YYYY-MM format - Assuming it's year and month for age calc
  email: string | null;
  createdAt: string;
  updatedAt: string;
  gender: string;
}

interface PaginatedResponse {
  content: Client[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

const getApiUrl = () => {
  // Keep existing getApiUrl function
  switch (process.env.NEXT_PUBLIC_ENV) {
    case "production":
      return process.env.NEXT_PUBLIC_PROD_API_URL;
    case "development":
      return process.env.NEXT_PUBLIC_DEV_API_URL;
    default:
      return process.env.NEXT_PUBLIC_LOCAL_API_URL;
  }
};

const formatGender = (gender: string) => {
  if (!gender) return "N/A";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
};

// Function to calculate age (assuming birthMonth is YYYY-MM)
const calculateAge = (birthMonth: string): number | string => {
  if (!birthMonth || !birthMonth.includes("-")) {
    return "N/A";
  }
  try {
    const [year, month] = birthMonth.split("-").map(Number);
    if (isNaN(year) || isNaN(month)) return "Invalid Date";

    const today = new Date();
    const birthDate = new Date(year, month - 1); // month is 0-indexed

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age >= 0 ? age : "N/A"; // Ensure age is not negative
  } catch (e) {
    console.error("Error calculating age:", e);
    return "Error";
  }
};

const ClientsClient = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const router = useRouter();
  const { session, isLoading: authLoading } = useSession();
  // const authClient = createAuthClient(); // Not used directly, session handles auth
  const searchParams = useSearchParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const hasClients = searchParams.get("hasClients");
    if (hasClients === "false" && !showDialog) {
      // Only show dialog if not already shown or triggered
      setShowDialog(true);
    }
  }, [searchParams, showDialog]); // Add showDialog dependency

  const handleDeleteClient = async () => {
    if (!selectedClient || !session?.access_token) return;

    setIsDeleting(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/clients/${selectedClient.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Improved error handling based on response status first
      if (!response.ok) {
        let errorMsg = "Failed to delete client";
        try {
          const result = await response.json();
          errorMsg = result.message || errorMsg;
        } catch (e) {
          // Ignore if response body is not JSON
        }
        throw new Error(errorMsg);
      }

      // Optional: Check response body if needed, assuming success based on status 2xx
      // const result = await response.json();
      // if (!result.success) { // Example check if your API returns a success flag
      //   throw new Error(result.message || "Failed to delete client");
      // }

      toast.success(`Successfully deleted ${selectedClient.name}`);
      fetchClients(currentPage); // Refresh current page
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete client. Please try again."
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedClient(null);
    }
  };

  const fetchClients = async (page: number, searchValue?: string) => {
    if (authLoading || !session?.access_token) {
      // Don't fetch if auth is loading or no session
      // Set loading to false if called prematurely
      if (!session && !authLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl();
      const params = new URLSearchParams({
        page: page.toString(),
        size: "10",
        sortBy: "name",
        sortDirection: "asc",
      });

      const currentSearchTerm =
        searchValue !== undefined ? searchValue : searchTerm;
      if (currentSearchTerm) {
        params.append("clientSearch", currentSearchTerm);
      }
      // Update state only if searchValue is explicitly provided
      if (searchValue !== undefined) {
        setSearchTerm(searchValue);
      }

      const response = await fetch(`${apiUrl}/clients?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const result = await response.json();
          errorMsg = result.message || errorMsg;
        } catch (e) {
          /* Ignore if body isn't json */
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      // Adjust according to your actual API response structure
      if (
        result &&
        typeof result.totalPages === "number" &&
        Array.isArray(result.content)
      ) {
        setClients(result.content);
        setCurrentPage(result.pageNumber);
        setTotalPages(result.totalPages);
      } else if (result.success && result.data) {
        // Keep compatibility with potential older structure
        setClients(result.data.content);
        setCurrentPage(result.data.pageNumber);
        setTotalPages(result.data.totalPages);
      } else {
        throw new Error(
          result.message || "Invalid data format received from API"
        );
      }
    } catch (error) {
      console.error("Fetch clients error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred while fetching clients."
      );
      setClients([]); // Clear clients on error
      setTotalPages(0);
      setCurrentPage(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setCurrentPage(0); // Reset to first page on new search
    fetchClients(0, value);
  };

  const handlePageChange = (page: number) => {
    if (page >= 0 && page < totalPages) {
      fetchClients(page);
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 3; // Reduced for better mobile fit within the range

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          onClick={() => handlePageChange(0)}
          isActive={currentPage === 0}
          className="w-9 h-9 p-0" // Ensure consistent button size
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Ellipsis after first page if needed
    if (currentPage > maxVisiblePages - 1) {
      // Show ellipsis if current page is beyond the initial visible range
      items.push(
        <PaginationItem key="ellipsis1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Calculate start and end page numbers for the middle section
    let startPage = Math.max(
      1,
      currentPage - Math.floor((maxVisiblePages - 1) / 2)
    );
    let endPage = Math.min(
      totalPages - 2,
      currentPage + Math.floor(maxVisiblePages / 2)
    );

    // Adjust start/end if near the boundaries
    if (currentPage < maxVisiblePages - 1) {
      endPage = Math.min(totalPages - 2, maxVisiblePages);
    }
    if (currentPage > totalPages - maxVisiblePages) {
      startPage = Math.max(1, totalPages - maxVisiblePages - 1);
    }

    // Show pages around current page
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
            className="w-9 h-9 p-0" // Ensure consistent button size
          >
            {i + 1}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Ellipsis before last page if needed
    if (currentPage < totalPages - maxVisiblePages) {
      // Show ellipsis if current page is far from the last page
      items.push(
        <PaginationItem key="ellipsis2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            onClick={() => handlePageChange(totalPages - 1)}
            isActive={currentPage === totalPages - 1}
            className="w-9 h-9 p-0" // Ensure consistent button size
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  useEffect(() => {
    // Fetch clients when session is available and auth is not loading
    if (!authLoading && session) {
      fetchClients(currentPage); // Fetch current page initially or after auth resolves
    } else if (!authLoading && !session) {
      // Handle case where user is logged out or session expired
      setIsLoading(false);
      setError("Please log in to view clients.");
      setClients([]);
      setTotalPages(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, authLoading]); // Dependency array

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowDialog(true);
  };

  const handleAddRCA = (client: Client) => {
    const age = calculateAge(client.birthMonth);
    router.push(
      `/rca?clientId=${client.id}&clientName=${encodeURIComponent(
        client.name
      )}&age=${age !== "N/A" ? age : ""}&gender=${client.gender}`
    );
  };

  const handleViewReports = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      router.push(`/reports?clientName=${encodeURIComponent(client.name)}`);
    } else {
      toast.error("Client not found to view reports.");
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setSelectedClient(null);
  };

  const handleDialogSuccess = (newClient?: Client) => {
    // Decide which page to refresh
    // If editing, stay on current page. If adding, go to first page (or last page if needed)
    const pageToRefresh = selectedClient ? currentPage : 0;
    fetchClients(pageToRefresh);
    handleDialogClose();
    toast.success(
      selectedClient
        ? "Client updated successfully"
        : "Client onboarded successfully"
    );
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setSelectedClient(null);
  };

  const isLoadingData = isLoading || authLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {" "}
      {/* Changed bg to gray-50 for subtle contrast */}
      <Header />
      <main className="container mx-auto px-4 sm:px-8 py-4 sm:py-8">
        {/* Back Navigation */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="mr-1.5" size={14} />
            Back to Dashboard
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {/* --- Responsive Header Section --- */}
        <div className="mb-6 space-y-4">
          {/* Title and Actions Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Clients
            </h1>
            {/* Actions grouped together */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <SearchClient
                onSearch={handleSearch}
                authToken={session?.access_token || ""}
                apiUrl={getApiUrl()}
              />
              <Button
                onClick={() => setShowDialog(true)}
                className="order-1 sm:order-2 w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Onboard New Client
              </Button>
            </div>
          </div>
        </div>
        {/* --- End Responsive Header Section --- */}

        {/* --- Desktop Table View --- */}
        <div className="hidden sm:block bg-white rounded-lg shadow overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="whitespace-nowrap">Name</TableHead>
                <TableHead className="whitespace-nowrap text-center w-20">
                  Age
                </TableHead>
                <TableHead className="whitespace-nowrap text-center w-24">
                  Gender
                </TableHead>
                <TableHead className="whitespace-nowrap w-36">
                  Phone Number
                </TableHead>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="text-right pr-6 whitespace-nowrap w-80">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingData ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center space-x-2 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading clients...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : clients && clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-center">
                      {calculateAge(client.birthMonth)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatGender(client.gender)}
                    </TableCell>
                    <TableCell>{client.phoneNumber}</TableCell>
                    <TableCell>
                      {client.email || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClient(client)}
                          aria-label={`Edit ${client.name}`}
                          className="hover:bg-gray-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(client)}
                          aria-label={`Delete ${client.name}`}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                        >
                          {isDeleting && selectedClient?.id === client.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddRCA(client)}
                          aria-label={`Add RCA Report for ${client.name}`}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 hover:border-green-300"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          RCA Report
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReports(client.id)}
                          aria-label={`View RCA Reports for ${client.name}`}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300"
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          RCA Reports
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-gray-500"
                  >
                    No clients found.{" "}
                    {searchTerm
                      ? "Try adjusting your search."
                      : 'Click "Onboard New Client" to add one.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* --- End Desktop Table View --- */}

        {/* --- Mobile Card View --- */}
        <div className="sm:hidden space-y-4">
          {isLoadingData ? (
            <div className="flex justify-center py-10">
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading clients...</span>
              </div>
            </div>
          ) : clients && clients.length > 0 ? (
            clients.map((client) => (
              <Card
                key={client.id}
                className="overflow-hidden shadow-sm border"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-base">{client.name}</h3>
                      <div className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                        <User size={14} />
                        <span>
                          {formatGender(client.gender)},{" "}
                          {calculateAge(client.birthMonth)} yrs
                        </span>
                      </div>
                    </div>
                    {/* Edit button maybe here? Or keep all actions below */}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span>{client.phoneNumber}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span>
                        {client.email || (
                          <span className="text-gray-400">No email</span>
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-4 py-3 bg-gray-50 grid grid-cols-2 gap-2">
                  {/* Grouping actions for mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClient(client)}
                    className="flex items-center justify-center gap-1.5"
                    aria-label={`Edit ${client.name}`}
                  >
                    <Edit2 className="h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(client)}
                    className="flex items-center justify-center gap-1.5 text-red-600 hover:text-red-700"
                    aria-label={`Delete ${client.name}`}
                  >
                    {isDeleting && selectedClient?.id === client.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddRCA(client)}
                    className="flex items-center justify-center gap-1.5 text-green-600 hover:text-green-700"
                    aria-label={`Add RCA Report for ${client.name}`}
                  >
                    <Plus className="h-4 w-4" /> Add RCA
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReports(client.id)}
                    className="flex items-center justify-center gap-1.5 text-blue-600 hover:text-blue-700"
                    aria-label={`View RCA Reports for ${client.name}`}
                  >
                    <Eye className="h-4 w-4" /> Reports
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow text-gray-500">
              No clients found.{" "}
              {searchTerm
                ? "Try adjusting your search."
                : 'Tap "Onboard New Client" to add one.'}
            </div>
          )}
        </div>
        {/* --- End Mobile Card View --- */}

        {/* --- Pagination --- */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center pb-4">
            <Pagination>
              <PaginationContent>
                {/* Previous Button */}
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm" // Consistent size
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="h-9 w-9 sm:w-auto sm:px-3 sm:gap-1" // Adjust width and padding for mobile/desktop
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                </PaginationItem>

                {/* Mobile Page Indicator */}
                <div className="flex items-center px-2 sm:hidden">
                  <span className="text-sm font-medium">
                    {currentPage + 1} / {totalPages}
                  </span>
                </div>

                {/* Desktop Page Links */}
                <div className="hidden sm:flex sm:items-center sm:space-x-1">
                  {renderPaginationItems()}
                </div>

                {/* Next Button */}
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm" // Consistent size
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="h-9 w-9 sm:w-auto sm:px-3 sm:gap-1" // Adjust width and padding for mobile/desktop
                    aria-label="Go to next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        {/* --- End Pagination --- */}
      </main>
      <ClientDialog
        isOpen={showDialog}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        client={selectedClient}
        // Conditionally pass isFirstClient based on fetched data, not just initial state
        isFirstClient={
          !isLoadingData && clients.length === 0 && !selectedClient
        }
      />
      <DeleteClientDialog
        isOpen={showDeleteDialog}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteClient}
        clientName={selectedClient?.name || ""}
      />
    </div>
  );
};

export default ClientsClient;
