"use client";
import React, { useState } from "react";
import { Accordion } from "react-bootstrap";
import Image from "next/image";
import UpdateBillingModal from "./UpdateBillingModal";
import { SubscriptionService } from "./subscriptionService";
import { useTheme } from "next-themes";

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface BillingInformationSectionProps {
  customer: Customer;
  token: string;
  onRefresh: () => void;
}

export default function BillingInformationSection({
  customer,
  token,
  onRefresh,
}: BillingInformationSectionProps) {
  const { theme } = useTheme();
  const [showUpdateBillingModal, setShowUpdateBillingModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingFormData, setBillingFormData] = useState({
    name: "",
    email: "",
  });

  const handleShowUpdateBilling = () => {
    if (customer?.id) {
      setBillingFormData({
        name: customer.name || "",
        email: customer.email || "",
      });
    } else {
      setBillingFormData({
        name: "",
        email: "",
      });
    }
    setShowUpdateBillingModal(true);
  };

  const handleConfirmBillingUpdate = async (data: {
    name: string;
    email: string;
  }) => {
    if (!customer?.id) {
      throw new Error("Customer information is missing");
    }
    setIsProcessing(true);
    try {
      await SubscriptionService.updateBillingInfo(token, customer?.id, data);
      await onRefresh();
    } catch (error) {
      console.error("Failed to update plan:", error);
    } finally {
      setShowUpdateBillingModal(false);
      setIsProcessing(false);
    }
  };

  const bgColor = theme === "dark" ? "#0f172a" : "#f9fafb"; // full background
  const headerBg = theme === "dark" ? "#1e293b" : "#ffffff";
  const cardBg = theme === "dark" ? "#1A202C" : "#FFFFFF";
  const borderColor = theme === "dark" ? "#2D3748" : "#E5E7EB";
  const textColor = theme === "dark" ? "#E2E8F0" : "#0C1F3F";
  const labelColor = theme === "dark" ? "#A0AEC0" : "#3D4B65";

  return (
    <div>
      <Accordion defaultActiveKey="0" className="mb-3 border-0">
        <Accordion.Item eventKey="0" className="border-0">
          <Accordion.Header style={{ backgroundColor: headerBg }}>
            <span
              style={{
                color: textColor,
                fontSize: "18px",
                fontWeight: "700",
              }}
            >
              Billing And Shipping Information
            </span>
          </Accordion.Header>
          <Accordion.Body className="p-3" style={{ backgroundColor: bgColor }}>
            <div
              style={{
                border: `1px solid ${borderColor}`,
                borderRadius: "16px",
                padding: "24px",
                backgroundColor: cardBg,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Name */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}>
                  <div
                    style={{
                      minWidth: "60px",
                      color: labelColor,
                      fontSize: "14px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Name
                  </div>
                  <div
                    style={{
                      color: textColor,
                      fontSize: "14px",
                      wordBreak: "break-word",
                      flex: 1,
                    }}
                  >
                    {customer.name || "Not available"}
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}>
                  <div
                    style={{
                      minWidth: "60px",
                      color: labelColor,
                      fontSize: "14px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Email
                  </div>
                  <div
                    style={{
                      color: textColor,
                      fontSize: "14px",
                      wordBreak: "break-word",
                      flex: 1,
                    }}
                  >
                    {customer.email || "Not available"}
                  </div>
                </div>
              </div>
            </div>

            {/* Update Button */}
            <div className="mt-3">
              <div
                className="add-payment-btn flex items-center cursor-pointer gap-2"
                onClick={handleShowUpdateBilling}
                style={{ display: "flex", gap: "5px" }}
              >
                <Image src="/pencil.svg" alt="Edit" width={20} height={20} />
                <span
                  style={{
                    color: textColor,
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  Update information
                </span>
              </div>
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {/* Modal */}
      <UpdateBillingModal
        show={showUpdateBillingModal}
        onClose={() => setShowUpdateBillingModal(false)}
        onConfirm={handleConfirmBillingUpdate}
        isProcessing={isProcessing}
        initialData={billingFormData}
      />
    </div>
  );
}
