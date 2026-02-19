import React from "react";
import { Phone, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactModal: React.FC<{ isOpen: boolean; toggleDialog: () => void }> = ({
  isOpen,
  toggleDialog,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-80 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">Contact Us</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDialog}
            className="h-8 w-8 p-0 rounded-full"
          ></Button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            We're here to help with your queries
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-blue-600">
                <Phone className="h-5 w-5" />
              </div>
              <a
                href="https://wa.me/917892849030"
                className="text-gray-800 hover:text-blue-600 transition-colors text-sm"
              >
                +91 7892849030
              </a>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <a
                href="mailto:support@wholisticmend.in"
                className="text-gray-800 hover:text-blue-600 transition-colors text-sm"
              >
                support@wholisticmend.in
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t bg-gray-50">
          <Button
            onClick={toggleDialog}
            variant="outline"
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
