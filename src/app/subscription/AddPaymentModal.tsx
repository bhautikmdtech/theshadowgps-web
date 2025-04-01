import { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "react-toastify";
import { PageLoader } from "@/components";
import { useSearchParams } from "next/navigation";
import axiosClient from "@/lib/axiosClient";

interface AddPaymentModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
}

export default function AddPaymentModal({
  show,
  onClose,
  onSuccess,
  customerId,
}: AddPaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Get token from URL using Next.js functionality
  const getToken = (): string | null => {
    const token = searchParams.get("token");
    if (
      token &&
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/.test(token)
    ) {
      return token;
    }
    return null;
  };

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

      // Submit the form first as required by Stripe's latest API
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Use the Stripe Elements to create a payment method
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          elements,
          params: {},
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!paymentMethod) {
        throw new Error("Failed to create payment method");
      }

      const response = await axiosClient.post(
        `/api/app/subscription/payment-methods/${customerId}`,
        {
          paymentMethodId: paymentMethod.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Payment method added successfully!");
      onSuccess();
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
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
        <Modal.Title id="addPaymentMethodModalLabel">
          Add Payment Method
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} id="payment-form">
          <div className="mb-4">
            {!paymentElementReady && (
              <div className="text-center py-2 mb-2">
                <PageLoader
                  type="spinner"
                  size="sm"
                  text="Loading payment form..."
                />
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
              <PageLoader type="spinner" size="sm" className="me-2" />
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
