import React from 'react';
import { Accordion, Spinner } from 'react-bootstrap';
import { FaExternalLinkAlt } from 'react-icons/fa';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  currency: string;
  status: string;
  url?: string;
}

interface InvoiceHistorySectionProps {
  invoices?: {
    data: Invoice[];
    hasMore: boolean;
  };
  isLoadingInvoices: boolean;
  loadMoreInvoices: () => Promise<void>;
}

export default function InvoiceHistorySection({
  invoices,
  isLoadingInvoices,
  loadMoreInvoices
}: InvoiceHistorySectionProps) {
  return (
    <Accordion defaultActiveKey="0" className="mb-3">
      <Accordion.Item eventKey="0" className="border">
        <Accordion.Header>
          <span className="fw-medium">Invoice History</span>
        </Accordion.Header>
        <Accordion.Body className="p-0">
          {isLoadingInvoices &&
          (!invoices ||
            !invoices.data ||
            invoices.data.length === 0) ? (
            <div className="text-center py-3" id="invoice-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : invoices &&
            invoices.data &&
            invoices.data.length > 0 ? (
            <div id="invoices-container" className="px-3">
              {/* Display visible invoices */}
              {invoices.data.map(
                (invoice: Invoice, index: number) => (
                  <div
                    key={`${invoice.id}-${index}`}
                    className="invoice d-flex justify-content-between align-items-center py-2 border-bottom"
                  >
                    <div className="invoice-date">
                      {new Date(invoice.date).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </div>
                    <div className="invoice-amount">
                      ${parseFloat(invoice.amount).toFixed(2)}
                    </div>
                    <div className="invoice-status-container text-center">
                      <span 
                        className={`invoice-status badge rounded-pill ${
                          invoice.status === "paid" ? "bg-success" : 
                          invoice.status === "open" ? "bg-warning" : 
                          "bg-secondary"
                        }`}
                      >
                        {invoice.status === "paid"
                          ? "Paid"
                          : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <div className="invoice-link">
                      {invoice.url && (
                        <a
                          href={invoice.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary"
                        >
                          <FaExternalLinkAlt />
                        </a>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Show View More button if there are more invoices to show */}
              {invoices.hasMore && (
                <div
                  className="text-center py-3"
                  id="load-more-container"
                >
                  <button
                    className="btn btn-link text-decoration-none"
                    onClick={loadMoreInvoices}
                    disabled={isLoadingInvoices}
                  >
                    {isLoadingInvoices ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
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