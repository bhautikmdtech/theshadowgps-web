import { useState } from 'react';
import { Modal, Button, Form, Badge, Spinner } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import { PaymentMethod } from './types';

interface UpdatePaymentModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodId: string | null;
  onPaymentMethodSelect: (id: string) => void;
  onAddNewPaymentMethod: () => void;
  getCardIcon: (brand: string) => any;
}

export default function UpdatePaymentModal({
  show,
  onClose,
  onConfirm,
  isProcessing,
  paymentMethods,
  selectedPaymentMethodId,
  onPaymentMethodSelect,
  onAddNewPaymentMethod,
  getCardIcon
}: UpdatePaymentModalProps) {
  
  // Helper function to get card label from the brand
  const getCardLabel = (brand: string): string => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
      style={{ zIndex: 9999 }}
      className="update-payment-modal"
    >
      <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa' }}>
        <Modal.Title>Update Payment Method</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {paymentMethods.length > 0 ? (
          <>
            <div className="mb-3">
              <h6 className="mb-3">Select payment method</h6>
              {paymentMethods.map((method: PaymentMethod) => (
                <div
                  key={method.id}
                  className={`p-3 border rounded mb-2 d-flex align-items-center ${
                    selectedPaymentMethodId === method.id
                      ? "border-primary bg-light"
                      : ""
                  }`}
                  onClick={() => onPaymentMethodSelect(method.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center flex-grow-1">
                    <div className="me-3">
                      {(() => {
                        const IconComponent = getCardIcon(method.brand);
                        return (
                          <IconComponent
                            size={20}
                            className={
                              selectedPaymentMethodId === method.id
                                ? "text-primary"
                                : "text-secondary"
                            }
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <div
                        className={`fw-medium ${
                          selectedPaymentMethodId === method.id
                            ? "text-primary"
                            : ""
                        }`}
                      >
                        {getCardLabel(method.brand)}{" "}
                        ending in {method.last4}
                        {method.isDefault && (
                          <Badge
                            bg="primary"
                            className="ms-2 rounded-pill"
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted">
                        Expires {method.expMonth}/{method.expYear}
                      </small>
                    </div>
                  </div>
                  <Form.Check
                    type="radio"
                    name="payment-method"
                    id={`payment-method-${method.id}`}
                    checked={selectedPaymentMethodId === method.id}
                    onChange={() => onPaymentMethodSelect(method.id)}
                    className="ms-3"
                  />
                </div>
              ))}
            </div>
            <h6 className="mb-3">Or add a new payment method</h6>
            <div
              className="d-flex align-items-center justify-content-center text-primary border border-dashed p-3 rounded cursor-pointer"
              onClick={() => {
                onClose();
                onAddNewPaymentMethod();
              }}
              style={{ cursor: "pointer", minHeight: "60px" }}
            >
              <FaPlus className="me-2" />
              <span>Add new payment method</span>
            </div>
          </>
        ) : (
          <>
            <div className="alert alert-info mb-4">
              No saved payment methods available. Please add a new payment
              method below.
            </div>
            <div
              className="d-flex align-items-center justify-content-center text-primary border border-dashed p-3 rounded cursor-pointer"
              onClick={() => {
                onClose();
                onAddNewPaymentMethod();
              }}
              style={{ cursor: "pointer", minHeight: "60px" }}
            >
              <FaPlus className="me-2" />
              <span>Add payment method</span>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={isProcessing || !selectedPaymentMethodId}
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
            "Update Payment Method"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 