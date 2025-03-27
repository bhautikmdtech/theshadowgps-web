import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
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
  const modalRef = useRef<HTMLDivElement>(null);
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Bootstrap modal
    const initModal = async () => {
      if (typeof document !== 'undefined' && modalRef.current) {
        try {
          // Dynamic import to avoid server-side rendering issues
          const bootstrap = await import('bootstrap');
          
          // Get the modal element and initialize it
          const modalElement = modalRef.current;
          const modal = new bootstrap.Modal(modalElement);
          
          // Show or hide based on prop
          if (show) {
            modal.show();
          } else {
            modal.hide();
          }
          
          // Add event listener to call onClose when modal is hidden
          modalElement.addEventListener('hidden.bs.modal', () => {
            onClose();
          });
          
        } catch (error) {
          console.error('Failed to initialize Bootstrap modal:', error);
        }
      }
    };

    initModal();
    
    // Cleanup on unmount
    return () => {
      if (modalRef.current) {
        modalRef.current.removeEventListener('hidden.bs.modal', onClose);
      }
    };
  }, [show, onClose]);

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
      
      // Close the modal
      if (modalRef.current) {
        const bootstrap = await import('bootstrap');
        const modalInstance = bootstrap.Modal.getInstance(modalRef.current);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "An unknown error occurred");
      toast.error(err.message || "Failed to add payment method");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div 
      className="modal fade" 
      id="addPaymentMethodModal" 
      tabIndex={-1} 
      aria-labelledby="addPaymentMethodModalLabel" 
      aria-hidden="true"
      ref={modalRef}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="addPaymentMethodModalLabel">Add Payment Method</h5>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} id="payment-form">
              <div className="mb-4">
                {!paymentElementReady && (
                  <div className="text-center py-2 mb-2">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
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
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-outline-secondary" 
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-form"
              id="submit-payment-method"
              disabled={!stripe || !paymentElementReady || processing}
              className="btn btn-primary"
            >
              {processing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                  Processing...
                </>
              ) : (
                "Add Payment Method"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react'; 