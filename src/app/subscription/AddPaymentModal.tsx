import { useState, useEffect } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaSpinner } from "react-icons/fa";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "react-toastify";

interface AddPaymentModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  baseUrl: string;
  getToken: () => string | null;
}

export default function AddPaymentModal({ 
  show, 
  onClose, 
  onSuccess,
  customerId,
  baseUrl,
  getToken
}: AddPaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (elements) {
      setPaymentElementReady(true);
    }
  }, [elements]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !customerId) {
      setError("Payment system is not fully loaded. Please try again.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Use the Stripe Elements to create a payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
        params: {},
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!paymentMethod) {
        throw new Error("Failed to create payment method");
      }

      // Send payment method to backend
      const response = await fetch(`${baseUrl}/api/app/subscription/payment-methods/${customerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add payment method");
      }

      toast.success("Payment method added successfully!");
      onSuccess();
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(errorMessage || "Failed to add payment method");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
      aria-labelledby="addPaymentMethodModalLabel"
    >
      <Modal.Header closeButton>
        <Modal.Title id="addPaymentMethodModalLabel">Add Payment Method</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} id="payment-form">
          <div className="mb-4">
            {!paymentElementReady && (
              <div className="text-center py-2 mb-2">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>Loading payment form...</span>
              </div>
            )}

            <div id="card-element">
              <PaymentElement
                options={{
                  layout: {
                    type: "tabs",
                    defaultCollapsed: false,
                  },
                }}
                onReady={() => setPaymentElementReady(true)}
                onChange={() => setError(null)}
              />
            </div>

            {error && (
              <div className="alert alert-danger mt-3 mb-0" id="card-errors">
                {error}
              </div>
            )}
          </div>
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="outline-secondary" 
          onClick={onClose}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          form="payment-form"
          id="submit-payment-method"
          disabled={!stripe || !paymentElementReady || processing}
        >
          {processing ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Processing...
            </>
          ) : (
            "Add Payment Method"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 