import React from 'react';
import { Accordion, Button } from 'react-bootstrap';
import { FaEdit } from 'react-icons/fa';

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface BillingInformationSectionProps {
  customer: Customer;
  onUpdateBilling: () => void;
}

export default function BillingInformationSection({
  customer,
  onUpdateBilling
}: BillingInformationSectionProps) {
  return (
    <Accordion defaultActiveKey="0" className="mb-3">
      <Accordion.Item eventKey="0" className="border">
        <Accordion.Header>
          <span className="fw-medium">
            Billing And Shipping Information
          </span>
        </Accordion.Header>
        <Accordion.Body className="p-3">
          <div className="mb-3">
            <div className="text-muted small">Name</div>
            <div>{customer.name || "Not available"}</div>
          </div>
          <div className="mb-3">
            <div className="text-muted small">Email</div>
            <div>
              {customer.email || "Not available"}
            </div>
          </div>
          <div>
            <Button
              variant="link"
              className="text-decoration-none text-primary p-0"
              onClick={onUpdateBilling}
            >
              <FaEdit className="me-2" />
              Update information
            </Button>
          </div>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
} 