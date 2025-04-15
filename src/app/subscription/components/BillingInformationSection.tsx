import React, { useState } from "react";
import { Accordion } from "react-bootstrap";
import Image from "next/image";
import UpdateBillingModal from "./UpdateBillingModal";
import { SubscriptionService } from "./subscriptionService";

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
  return (
    <>
      <Accordion defaultActiveKey="0" className="mb-3 border-0">
        <Accordion.Item eventKey="0" className="border-0">
          <Accordion.Header>
            <span
              style={{ color: "#0C1F3F", fontSize: "18px", fontWeight: "700" }}
            >
              Billing And Shipping Information
            </span>
          </Accordion.Header>
          <Accordion.Body className="p-3">
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: "16px",
                padding: "24px",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  maxWidth: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      minWidth: "60px",
                      color: "#3D4B65",
                      fontSize: "14px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Name
                  </div>
                  <div
                    style={{
                      color: "#0C1F3F",
                      fontSize: "14px",
                      wordBreak: "break-word",
                      flex: 1,
                    }}
                  >
                    {customer.name || "Not available"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      minWidth: "60px",
                      color: "#3D4B65",
                      fontSize: "14px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Email
                  </div>
                  <div
                    style={{
                      color: "#0C1F3F",
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
            <div>
              <div
                className="add-payment-btn mt-3 flex items-center cursor-pointer gap-2 "
                onClick={handleShowUpdateBilling}
                style={{
                  display: "flex",
                  gap: "5px",
                }}
              >
                <Image src="/pencil.svg" alt="Edit" width={20} height={20} />
                <span
                  style={{
                    color: "#0C1F3F",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  {" "}
                  Update information
                </span>
              </div>
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <UpdateBillingModal
        show={showUpdateBillingModal}
        onClose={() => setShowUpdateBillingModal(false)}
        onConfirm={handleConfirmBillingUpdate}
        isProcessing={isProcessing}
        initialData={billingFormData}
      />
    </>
  );
}
