import React, { useState } from "react";
import { Accordion } from "react-bootstrap";
import { PageLoader } from "@/components";
import { SubscriptionService } from "./subscriptionService";
import { toast } from "react-toastify";

interface Invoice {
  id: string;
  date: string;
  amount: string;
  currency: string;
  status: string;
  url?: string;
}

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface InvoiceHistorySectionProps {
  token: string;
  customer: Customer;
  invoices?: {
    data: Invoice[];
    hasMore: boolean;
  };
  onRefresh: () => void;
}

export default function InvoiceHistorySection({
  token,
  customer,
  invoices,
}: InvoiceHistorySectionProps) {
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoicesData, setInvoicesData] = useState<Invoice[]>(
    invoices?.data || []
  );
  const [hasMore, setHasMore] = useState(invoices?.hasMore || false);

  const loadMoreInvoices = async () => {
    try {
      setIsLoadingInvoices(true);

      if (!token)
        throw new Error("No authentication token found. Please log in again.");
      if (!customer?.id) throw new Error("Customer information is missing");

      const limit = invoicesData.length + 10;

      const response = await SubscriptionService.loadMoreInvoices(
        token,
        limit,
        customer.id
      );
      const newInvoices: Invoice[] = response?.invoices || [];
      const updatedHasMore: boolean = response?.hasMore || false;

      const existingIds = new Set(invoicesData.map((inv) => inv.id));
      const filteredNew = newInvoices.filter((inv) => !existingIds.has(inv.id));

      setInvoicesData((prev) => [...prev, ...filteredNew]);
      setHasMore(updatedHasMore);
    } catch (error: any) {
      const errorMessage =
        error.response?.data || error.message || "Failed to load invoices";
      toast.error(
        typeof errorMessage === "string"
          ? errorMessage
          : "Failed to load invoices"
      );
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  return (
    <Accordion defaultActiveKey="0" className="mb-3 border-0">
      <Accordion.Item eventKey="0" className="border-0">
        <Accordion.Header className="bg-white">
          <span
            style={{ color: "#0C1F3F", fontSize: "18px", fontWeight: "700" }}
          >
            Invoice History
          </span>
        </Accordion.Header>
        <Accordion.Body className="p-0">
          {isLoadingInvoices && invoicesData.length === 0 ? (
            <div className="text-center py-3" id="invoice-loading">
              <PageLoader type="spinner" color="#007bff" />
            </div>
          ) : invoicesData.length > 0 ? (
            <div id="invoices-container" className="px-3">
              {invoicesData.map((invoice, index) => (
                <a
                  href={invoice.url}
                  target="_blank"
                  key={`${invoice.id}-${index}`}
                  className="invoice d-flex justify-content-between align-items-center py-2 text-decoration-none"
                >
                  <div className="invoice-date">
                    {new Date(invoice.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="invoice-amount">
                    ${parseFloat(invoice.amount).toFixed(2)}
                  </div>
                  <div className="invoice-status-container text-center">
                    <span
                      className="invoice-status badge rounded-pill"
                      style={{
                        backgroundColor:
                          invoice.status === "paid"
                            ? "#D6E6FF"
                            : invoice.status === "failed"
                            ? "#ffe6e6"
                            : invoice.status === "draft"
                            ? "#ffe6e6"
                            : invoice.status === "uncollectible"
                            ? "#ffe6e6"
                            : invoice.status === "void"
                            ? "#f0f0f5"
                            : "#6c757d", // default color for any other status
                        color:
                          invoice.status === "paid" || invoice.status === "open"
                            ? "#3D4B65"
                            : "white",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {invoice.status.charAt(0).toUpperCase() +
                        invoice.status.slice(1)}
                    </span>
                  </div>
                </a>
              ))}

              {hasMore && (
                <div className="text-center py-3" id="load-more-container">
                  <button
                    className="btn btn-link text-decoration-none"
                    onClick={loadMoreInvoices}
                    disabled={isLoadingInvoices}
                  >
                    {isLoadingInvoices ? (
                      <>
                        <PageLoader type="spinner" size="sm" className="me-2" />
                        Loading...
                      </>
                    ) : (
                      "View More"
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div id="no-invoices-message" className="text-center py-3">
              <p className="text-muted mb-0">No invoices found.</p>
            </div>
          )}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}
