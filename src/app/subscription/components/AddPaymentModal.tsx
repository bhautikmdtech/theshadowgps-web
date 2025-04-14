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
  onRefresh: () => Promise<void>;
  customerId: string;
}

export default function AddPaymentModal({
  show,
  onClose,
  onRefresh,
  customerId,
}: AddPaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (elements) setPaymentElementReady(true);
  }, [elements]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      if (!stripe || !elements || !token || !customerId) {
        throw new Error("Missing required payment details.");
      }

      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({ elements });

      if (stripeError) throw new Error(stripeError.message);
      console.log("paymentMethod", paymentMethod);
      if (!paymentMethod) throw new Error("No payment method returned.");

      try {
        await axiosClient.post(
          `/api/app/subscription/payment-methods/${customerId}`,
          { paymentMethodId: paymentMethod.id },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        toast.success("Payment method added successfully!");
        await onRefresh();
        onClose();
      } catch (apiError: any) {
        // Handle backend API errors
        const errorMessage = apiError.response?.data?.message || 
                            apiError.response?.data?.error || 
                            apiError.message || 
                            "Failed to add payment method";
        throw new Error(errorMessage);
      }
    } catch (err: Error | unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error('Failed to add payment method');
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
        <Modal.Title>Add Payment Method</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} id="payment-form">
          {!paymentElementReady && (
            <div className="text-center mb-3">
              <PageLoader
                type="spinner"
                size="sm"
                text="Loading payment form..."
              />
            </div>
          )}

          <PaymentElement
            options={{ layout: "tabs" }}
            onReady={() => setPaymentElementReady(true)}
            onChange={() => setError(null)}
          />

          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </form>
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
          disabled={processing}
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
          form="payment-form"
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
