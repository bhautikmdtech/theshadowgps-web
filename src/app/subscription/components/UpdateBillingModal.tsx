import { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";

interface UpdateBillingModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; email: string }) => Promise<void>;
  isProcessing: boolean;
  initialData: {
    name: string;
    email: string;
  };
}

export default function UpdateBillingModal({
  show,
  onClose,
  onConfirm,
  isProcessing,
  initialData,
}: UpdateBillingModalProps) {
  const [formData, setFormData] = useState(initialData);

  // Update formData when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Update Customer Information</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form id="billing-form" onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label style={{ 
              fontSize: '14px',
              color: '#0C1F3F',
              marginBottom: '8px'
            }}>Name</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              size="lg"
              style={{
                fontSize: "16px",
                color: "#6E798B",
                padding: "16px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                backgroundColor: "#FFFFFF",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
              }}
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label style={{ 
              fontSize: '14px',
              color: '#0C1F3F',
              marginBottom: '8px'
            }}>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              size="lg"
              style={{
                fontSize: "16px",
                color: "#6E798B",
                padding: " 16px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                backgroundColor: "#FFFFFF",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
              }}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          style={{
            backgroundColor: "#E1ECFF",
            border: 0,
            borderRadius: "10px",
            color: "#337CFD",
          }}
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          style={{
            backgroundColor: "#337CFD",
            border: 0,
            borderRadius: "10px",
            color: "#FFFFFF",
          }}
          type="submit"
          form="billing-form"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Processing...
            </>
          ) : (
            "Update Information"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
