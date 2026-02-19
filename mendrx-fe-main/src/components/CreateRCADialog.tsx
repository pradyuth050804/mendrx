// src/components/CreateRCADialog.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CreateRCADialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clientName: string;
}

const CreateRCADialog: React.FC<CreateRCADialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  clientName,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create RCA Report</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Would you like to create an RCA report for {clientName}?</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Later
          </Button>
          <Button onClick={onConfirm}>Create RCA</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRCADialog;
