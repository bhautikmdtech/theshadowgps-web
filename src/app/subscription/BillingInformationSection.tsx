import React from 'react';
import { Accordion, Button } from 'react-bootstrap';
import { FaPen } from 'react-icons/fa';

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
    <Accordion defaultActiveKey="0" className="mb-3 border-0">
      <Accordion.Item eventKey="0" className="border-0">
        <Accordion.Header>
          <span style={{color: "#0C1F3F",fontSize: "20px",fontWeight: "700"}}>
            Billing And Shipping Information
          </span>
        </Accordion.Header>
        <Accordion.Body className="p-3" >
          <div style={{border: "1px solid #CFD2D9",borderRadius: "16px",padding: "16px",  backgroundColor: "#FFFFFF" ,}}>
          <div className="mb-3" style={{display: "flex", gap: "31px"}}>
            <div className="text-muted small" style={{color: "#3D4B65",fontSize: "18px",fontWeight: "700"}}>Name</div>
            <div style={{color: "#0C1F3F",fontSize: "16px",}}> {customer.name || "Not available"}</div>
          </div>
          <div className="mb-3" style={{display: "flex", gap: "31px"}}>
            <div className="text-muted small" style={{color: "#6C757D",fontSize: "18px",fontWeight: "700"}}>Email</div>
            <div style={{color: "#0C1F3F",fontSize: "16px",}}>
              {customer.email || "Not available"}
            </div>
          </div>
          </div>
          <div>
            <Button
              variant="link"
              className="text-decoration-none text-primary p-0 mt-3"
              onClick={onUpdateBilling}
              style={{display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              <FaPen className="me-2" style={{color: "#3D4B65"}}/>
            <span style={{color: "#0C1F3F",fontSize: "16px",fontWeight: "600"}}> Update information</span>
            </Button>
          </div>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
} 