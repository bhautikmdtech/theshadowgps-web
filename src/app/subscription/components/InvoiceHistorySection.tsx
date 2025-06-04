import React, { useState } from "react";
// import { Accordion } from "react-bootstrap";
import Accordion from 'react-bootstrap/Accordion';
import { PageLoader } from "@/components";
import { SubscriptionService } from "./subscriptionService";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";

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
  const { theme } = useTheme();
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
        <Accordion.Header className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
          <span
            style={{ 
              color: theme === 'dark' ? '#E2E8F0' : '#0C1F3F', 
              fontSize: "18px", 
              fontWeight: "700" 
            }}
          >
            Invoice History
          </span>
        </Accordion.Header>
        <Accordion.Body className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-0`}>
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
                  className={`invoice d-flex justify-content-between align-items-center py-2 text-decoration-none ${
                    theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <div 
                    className="invoice-date"
                    style={{ color: theme === 'dark' ? '#E2E8F0' : '#0C1F3F' }}
                  >
                    {new Date(invoice.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div 
                    className="invoice-amount"
                    style={{ color: theme === 'dark' ? '#E2E8F0' : '#0C1F3F' }}
                  >
                    ${parseFloat(invoice.amount).toFixed(2)}
                  </div>
                  <div className="invoice-status-container text-center">
                    <span
                      className="invoice-status badge rounded-pill"
                      style={{
                        backgroundColor:
                          invoice.status === "paid"
                            ? theme === 'dark' ? '#D6E6FF' : '#D6E6FF'
                            : invoice.status === "failed"
                            ? theme === 'dark' ? '#742A2A' : '#ffe6e6'
                            : invoice.status === "draft"
                            ? theme === 'dark' ? '#742A2A' : '#ffe6e6'
                            : invoice.status === "uncollectible"
                            ? theme === 'dark' ? '#742A2A' : '#ffe6e6'
                            : invoice.status === "void"
                            ? theme === 'dark' ? '#2D3748' : '#6c757d'
                            : theme === 'dark' ? 'rgb(121 121 121)' : '#6c757d',
                        color:
                          invoice.status === "paid" || invoice.status === "open"
                            ? theme === 'dark' ? '#E2E8F0' : '#3D4B65'
                            : theme === 'dark' ? '#E2E8F0' : 'white',
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
                    className={`btn btn-link text-decoration-none ${
                      theme === 'dark' ? 'text-blue-400' : 'text-primary'
                    }`}
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
            <div 
              id="no-invoices-message" 
              className="text-center py-3"
              style={{ color: theme === 'dark' ? '#A0AEC0' : '#6c757d' }}
            >
              <p className="mb-0">No invoices found.</p>
            </div>
          )}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}
