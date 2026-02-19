// File: src/components/NotesEditor.tsx
import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { createAuthClient } from "@/lib/supabase-auth";
import { useRouter } from "next/navigation";

interface NotesEditorProps {
  notes: string;
  reportId: string;
  onNotesUpdate: (newNotes: string) => void;
  getApiUrl: () => string | undefined;
  onDownloadNotes?: () => void; // New prop for download handler
  isNotesDownloading?: boolean; // New prop for loading state
}

const NotesEditor: React.FC<NotesEditorProps> = ({
  notes,
  reportId,
  onNotesUpdate,
  getApiUrl,
  onDownloadNotes,
  isNotesDownloading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes);
  const [isUpdating, setIsUpdating] = useState(false);
  const authClient = createAuthClient();
  const router = useRouter();

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setEditedNotes(notes);
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("API URL is not defined");
      }

      // Get current session using Supabase auth
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const response = await fetch(`${apiUrl}/update-notes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportId,
          notes: editedNotes,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update notes");
      }

      onNotesUpdate(editedNotes);
      setIsEditing(false);
      toast.success("Notes updated successfully");
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("Failed to update notes. Please refresh page & try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Additional Notes</h2>
        <div className="flex gap-2">
          {/* Add Edit Notes button first */}
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditToggle}
              className="h-8"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
          {/* Add Download Notes button if handler is provided */}
          {onDownloadNotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadNotes}
              disabled={isNotesDownloading || !notes || notes.trim() === ""}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              {isNotesDownloading ? "Generating..." : "Download"}
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={editedNotes}
          onChange={(e) => setEditedNotes(e.target.value)}
          className="min-h-[200px]"
          placeholder="Enter additional notes..."
        />
      ) : (
        <div className="prose prose-blue max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl font-bold my-4" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl font-bold my-3" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc ml-6 my-2" {...props} />
              ),
              li: ({ node, ...props }) => <li className="my-1" {...props} />,
              p: ({ node, ...props }) => <p className="my-2" {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-bold" {...props} />
              ),
            }}
          >
            {notes || "No additional notes"}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default NotesEditor;
