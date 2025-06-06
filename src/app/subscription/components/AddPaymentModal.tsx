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
import { attachPaymentMethod } from "@/services/StripeService";

interface AddPaymentModalProps {
  show: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  customerId: string;
  secret_key: string; // Use lowercase `string` for TypeScript primitive
}

export default function AddPaymentModal({
  show,
  onClose,
  onRefresh,
  customerId,
  secret_key,
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

    if (!stripe || !elements || !customerId) {
      setError("Stripe is not fully initialized or customer ID is missing.");
      setProcessing(false);
      return;
    }

    try {
      // Submit PaymentElement fields (validate input)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Create the payment method
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({ elements });

      if (stripeError) throw new Error(stripeError.message);
      if (!paymentMethod?.id)
        throw new Error("Payment method creation failed.");

      // Attach the payment method to customer using the StripeService
      const result: any = await attachPaymentMethod(
        paymentMethod.id,
        customerId,
        secret_key
      );

      if (result.error) {
        const errorCode = result.error?.code;

        if (errorCode === "card_declined") {
          throw new Error("Your card was declined.");
        }

        throw new Error(
          result.error.message || "Failed to attach payment method."
        );
      }

      await onRefresh();
      toast.success("Payment method added successfully!");
      onClose();
    } catch (err: any) {
      const msg =
        err?.message || "An unexpected error occurred. Please try again.";
      setError(msg);
      toast.error(`${msg}`);
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
          variant="light"
          onClick={onClose}
          disabled={processing}
          style={{
            backgroundColor: "#E1ECFF",
            borderRadius: "10px",
            color: "#337CFD",
            border: 0,
          }}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          form="payment-form"
          disabled={!stripe || !paymentElementReady || processing}
          style={{
            backgroundColor: "#337CFD",
            borderRadius: "10px",
            color: "#fff",
            border: 0,
          }}
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
