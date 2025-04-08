import { Modal, Button,Badge, Spinner } from "react-bootstrap";
import Image from 'next/image';
import { PaymentMethod } from "./types";
import {
  FaCreditCard,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover,
  FaCcDinersClub,
  FaCcJcb,
} from "react-icons/fa";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import React from "react";

interface UpdatePaymentModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodId: string | null;
  onPaymentMethodSelect: (id: string) => void;
  onAddNewPaymentMethod: () => void;
}

const getCardIcon = (brand: string) => {
  const brands: Record<string, any> = {
    visa: FaCcVisa,
    mastercard: FaCcMastercard,
    amex: FaCcAmex,
    discover: FaCcDiscover,
    diners: FaCcDinersClub,
    jcb: FaCcJcb,
  };

  return brands[brand.toLowerCase()] || FaCreditCard;
};

export default function UpdatePaymentModal({
  show,
  onClose,
  onConfirm,
  isProcessing,
  paymentMethods,
  selectedPaymentMethodId,
  onPaymentMethodSelect,
  onAddNewPaymentMethod,
}: UpdatePaymentModalProps) {
  // Helper function to get card label from the brand
  const getCardLabel = (brand: string): string => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getCardIcon = (brand: string): React.ReactNode => {
    const brands: Record<string, React.ReactNode> = {
      visa: <PaymentIcon type="Visa" format="flatRounded" width={30} />,
      mastercard: <PaymentIcon type="Mastercard" format="flatRounded" width={30} />,
      amex: <PaymentIcon type="Amex" format="flatRounded" width={30} />,
      discover: <PaymentIcon type="Discover" format="flatRounded" width={30} />,
      diners: <PaymentIcon type="Diners" format="flatRounded" width={30} />,
      jcb: <PaymentIcon type="Jcb" format="flatRounded" width={30} />,
    };

    return brands[brand.toLowerCase()] || <FaCreditCard />;
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
      <Modal.Header closeButton style={{ backgroundColor: "#f8f9fa" }}>
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
                  className={`p-3  mb-3 ${
                    selectedPaymentMethodId === method.id
                      ? "border-primary bg-light"
                      : ""
                  }`}
                  onClick={() => onPaymentMethodSelect(method.id)}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid #CFD2D9',
                    borderRadius: '25px',
                  }}
                >
                  <div className="d-flex align-items-center flex-grow-1">
                    <div className="me-3">
                    {(() => {
                                const IconComponent = getCardIcon(method.brand);
                                return (
                                  <>
                                    {React.isValidElement(IconComponent) ? (
                                      IconComponent
                                    ) : (
                                      <FaCreditCard size={26} className="text-gray-800" />
                                    )}
                                  </>
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
                        {getCardLabel(method.brand)} ending in {method.last4}
                        {method.isDefault && (
                          <Badge bg="primary" className="ms-2 rounded-pill">
                            Default
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted">
                        Expires {method.expMonth}/{method.expYear}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <h6 className="mb-3">Or add a new payment method</h6>
            <div
              className="d-flex align-items-center justify-content-center text-primary  p-2 rounded cursor-pointer gap-2"
              onClick={() => {
                onClose();
                onAddNewPaymentMethod();
              }}
              style={{
                backgroundColor: '#E1ECFF',
                border: 0,
                borderRadius: '10px',
                color: '#337CFD',
                cursor: "pointer", 
                minHeight: "45px" 
              }}
            >
                <Image src='/add-circle.svg' alt='Edit' width={24} height={24} />
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
              className="d-flex align-items-center justify-content-center text-primary  p-2 rounded cursor-pointer gap-2"
              onClick={() => {
                onClose();
                onAddNewPaymentMethod();
              }}
              style={{  backgroundColor: '#E1ECFF',
                border: 0,
                borderRadius: '10px',
                color: '#337CFD',
                cursor: "pointer", 
                minHeight: "45px"  }}
            >
              <Image src='/add-circle.svg' alt='Edit' width={24} height={24} />
              <span>Add payment method</span>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
           style={{
            backgroundColor: '#E1ECFF',
            border: 0,
            borderRadius: '10px',
            color: '#337CFD',
          }}
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          style={{
            backgroundColor: '#337CFD',
            border: 0,
            borderRadius: '10px',
            color: '#FFFFFF',
          }}
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
