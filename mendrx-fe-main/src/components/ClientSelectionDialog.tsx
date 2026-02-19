// src/components/ClientSelectionDialog.tsx
import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import debounce from "lodash/debounce";
import ClientDialog from "@/app/clients/ClientDialog";

interface Client {
  id: string;
  name: string;
  birthMonth: string;
  gender: string;
  phoneNumber: string;
}

interface ClientSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClientSelect: (client: Client) => void;
  authToken: string;
  getApiUrl: () => string | undefined;
}

export default function ClientSelectionDialog({
  isOpen,
  onClose,
  onClientSelect,
  authToken,
  getApiUrl,
}: ClientSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);

  const fetchClients = async (search?: string) => {
    setIsLoading(true);
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) throw new Error("API URL not defined");

      const searchParams = new URLSearchParams({
        page: "0",
        size: "10",
        sortBy: "name",
        sortDirection: "asc",
      });

      if (search) {
        searchParams.append("clientSearch", search);
      }

      const response = await fetch(
        `${apiUrl}/clients?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setClients(result.data.content);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      fetchClients(term);
    }, 300),
    [authToken]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const calculateAge = (birthMonth: string) => {
    const [year, month] = birthMonth.split("-").map(Number);
    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < 1)) {
      age--;
    }
    return age;
  };

  // Initialize on open
  React.useEffect(() => {
    if (isOpen) {
      fetchClients();
    } else {
      // Reset state when dialog closes
      setSearchTerm("");
      setSelectedClient(null);
    }
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Search clients by name or phone number..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedClient?.id === client.id
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                        <div className="flex gap-3 text-sm text-gray-500">
                          <span>
                            {calculateAge(client.birthMonth)} years •{" "}
                            {client.gender.charAt(0).toUpperCase() +
                              client.gender.slice(1).toLowerCase()}
                          </span>
                          <span>•</span>
                          <span>{client.phoneNumber}</span>
                        </div>
                      </div>
                      <div className="h-4 w-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                        {selectedClient?.id === client.id && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!isLoading && clients.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 mb-4">
                      {searchTerm
                        ? "No clients found with the specified search criteria."
                        : "-"}
                    </p>
                    {searchTerm && (
                      <Button
                        onClick={() => {
                          setShowClientDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Onboard New Client
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedClient && onClientSelect(selectedClient)}
                disabled={!selectedClient}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ClientDialog
        isOpen={showClientDialog}
        onClose={() => {
          setShowClientDialog(false);
        }}
        onSuccess={() => {
          setShowClientDialog(false);
          // Reopen client selection dialog & refresh the list
          if (searchTerm) {
            fetchClients(searchTerm);
          }
        }}
        isFirstClient={false}
        skipRCADialog={true}
      />
    </>
  );
}
