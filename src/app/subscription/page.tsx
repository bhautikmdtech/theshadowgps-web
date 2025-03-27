"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  Button,
  Form,
  Spinner,
  Badge,
  Accordion,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faExclamationCircle,
  faCube,
  faPencilAlt,
  faExternalLinkAlt,
  faExclamationTriangle,
  faCreditCard,
  faPlus,
  faEllipsisV,
  faCheck,
  faTrash,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import {
  faCcVisa,
  faCcMastercard,
  faCcAmex,
  faCcDiscover,
  faCcDinersClub,
  faCcJcb,
} from "@fortawesome/free-brands-svg-icons";
import { ToastContainer, toast } from "react-toastify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ThreeDots } from "react-loader-spinner";

// Declare Stripe types for TypeScript
declare global {
  interface Window {
    Stripe?: import("@stripe/stripe-js").StripeConstructor;
  }
}

// Types
interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface Device {
  deviceName: string;
  deviceImage?: string;
}

interface Subscription {
  id: string;
  status: string;
  amount: string;
  interval: string;
  renewalDate: string;
  cancelAt?: string;
  cancelStatus?: boolean;
  isInGracePeriod?: boolean;
  graceEndDate?: string;
  gracePeriodMessage?: string;
  isCollectionPaused?: boolean;
  resumeAt?: string;
  device?: Device;
  paymentMethod?: PaymentMethod;
  planId: string;
}

interface Plan {
  id: string;
  name: string;
  description?: string;
  amount: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  currency: string;
  status: string;
  url?: string;
}

interface SubscriptionData {
  customer: Customer;
  subscriptions: Subscription[];
  paymentMethods: PaymentMethod[];
  plans: Plan[];
  stripePublishableKey: string;
  clientSecret: string;
  invoices?: {
    data: Invoice[];
    hasMore: boolean;
  };
}

const getTokenFromUrl = (): string | null => {
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    if (
      token &&
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/.test(token)
    ) {
      return token;
    }
  }
  return null;
};

// CheckoutForm component for Stripe Elements
const CheckoutForm = ({
  onSuccess,
  customerId,
}: {
  onSuccess: () => void;
  customerId: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

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
      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Use PaymentElement instead of CardElement
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

      // Send payment method to backend
      const response = await fetch("/api/add-payment-method", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          customerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add payment method");
      }

      setSucceeded(true);
      toast.success("Payment method added successfully!");

      // Close modal after success
      onSuccess();
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "An unknown error occurred");
      toast.error(err.message || "Failed to add payment method");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="mb-4">
        {!paymentElementReady && (
          <div className="text-center py-2 mb-2">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Loading payment form...</span>
          </div>
        )}

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

        {error && (
          <div className="alert alert-danger mt-3 mb-0">
            <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || !paymentElementReady || processing || succeeded}
        className="btn btn-primary w-100"
      >
        {processing ? (
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
          "Add Payment Method"
        )}
      </button>
    </form>
  );
};

export default function SubscriptionViewer() {
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<
    string | null
  >(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [stripeInitialized, setStripeInitialized] = useState(false);

  // Modal states
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [showCancelSubscriptionModal, setShowCancelSubscriptionModal] =
    useState(false);
  const [showUpdatePlanModal, setShowUpdatePlanModal] = useState(false);
  const [showUpdateBillingModal, setShowUpdateBillingModal] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingFormData, setBillingFormData] = useState({
    name: "",
    email: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingEndDate, setBillingEndDate] = useState("");

  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const baseUrl = "http://localhost:5000";

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setIsLoading(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/getStripeData`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(errorText);
        throw new Error(errorText || "Failed to load subscription data");
      }

      const data = await response.json();
      setSubscriptionData(data.data);

      if (
        data.data.paymentMethods?.length > 0 ||
        (data.data.stripePublishableKey && data.data.clientSecret)
      ) {
        await initializeStripe(
          data.data.stripePublishableKey,
          data.data.clientSecret
        );
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to load subscription data");
      toast.error(error.message || "Failed to load subscription data");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeStripe = async (
    publishableKey: string,
    clientSecret: string
  ) => {
    if (stripeInitialized) return true;

    if (!publishableKey) {
      toast.error(
        "Payment system configuration is missing. Please contact support."
      );
      return false;
    }

    try {
      if (!/^pk_test_|^pk_live_/.test(publishableKey)) {
        toast.error("Invalid Stripe publishable key format");
        return false;
      }

      const stripePromiseInstance = loadStripe(publishableKey);

      if (!stripePromiseInstance) {
        toast.error("Failed to create Stripe instance");
        return false;
      }

      setStripePromise(stripePromiseInstance);
      setClientSecret(clientSecret);
      setStripeInitialized(true);
      return true;
    } catch (error: any) {
      toast.error(
        "Failed to initialize payment system. Please refresh the page or try again later."
      );
      return false;
    }
  };

  const loadMoreInvoices = async () => {
    try {
      setIsLoadingInvoices(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      if (!subscriptionData?.customer?.id) {
        throw new Error("Customer information is missing");
      }

      // Fix the linter error by using a safe default value
      const currentCount = subscriptionData?.invoices?.data?.length || 0;
      const limit = currentCount + 10; // Request 10 more invoices than we currently have

      const response = await fetch(
        `${baseUrl}/api/app/subscription/invoices/${subscriptionData.customer.id}?limit=${limit}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load more invoices");
      }

      const data = await response.json();
      
      setSubscriptionData((prevData) => {
        if (!prevData) return null;

        // Get existing invoices
        const existingInvoices = prevData.invoices?.data || [];
        const existingIds = new Set(existingInvoices.map(inv => inv.id));
        
        // Filter out any duplicates from the new invoices
        const newInvoices = data.invoices.filter(
          (invoice: Invoice) => !existingIds.has(invoice.id)
        );

        // Merge with new invoices (preventing duplicates)
        const updatedInvoices = {
          data: [...existingInvoices, ...newInvoices],
          hasMore: data.hasMore,
        };

        // Return updated data
        return {
          ...prevData,
          invoices: updatedInvoices,
        };
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to load invoices");
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const getCardIcon = (brand: string) => {
    const brands: Record<string, any> = {
      visa: faCcVisa,
      mastercard: faCcMastercard,
      amex: faCcAmex,
      discover: faCcDiscover,
      diners: faCcDinersClub,
      jcb: faCcJcb,
    };

    return brands[brand.toLowerCase()] || faCreditCard;
  };

  // Helper function to get card label from the brand
  const getCardLabel = (brand: string): string => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  // Updated handleAddPaymentMethod with better null checks
  const handleAddPaymentMethod = async () => {
    try {
      if (!subscriptionData?.customer?.id) {
        toast.error("Customer information is missing. Please reload the page.");
        return;
      }

      if (
        !subscriptionData.stripePublishableKey ||
        !subscriptionData.clientSecret
      ) {
        toast.error(
          "Payment configuration is missing. Please contact support."
        );
        return;
      }

      // Initialize Stripe
      const initialized = await initializeStripe(
        subscriptionData.stripePublishableKey,
        subscriptionData.clientSecret
      );

      if (!initialized) {
        throw new Error("Failed to initialize payment system");
      }

      // If all checks pass, show the modal
      if (stripePromise && clientSecret) {
        setShowAddPaymentModal(true);
      } else {
        toast.error("Payment elements not initialized");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initialize payment form");
    }
  };

  // Handle payment method submission
  const handleSubmitPaymentMethod = async (paymentMethodId: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      if (!subscriptionData?.customer?.id) {
        throw new Error("Customer information is missing");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/payment-methods/${subscriptionData.customer.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            paymentMethodId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add payment method");
      }

      toast.success("Payment method added successfully!");
      await fetchSubscriptionData();
      setShowAddPaymentModal(false);
    } catch (error: any) {
      console.error("Add payment method error:", error);
      toast.error(error.message || "Failed to add payment method");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleSubmitUpdatePayment to use API call
  const handleSubmitUpdatePayment = async () => {
    if (!currentSubscriptionId || !selectedPaymentMethodId) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/${currentSubscriptionId}/payment-method`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            paymentMethodId: selectedPaymentMethodId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update payment method");
      }

      toast.success("Payment method updated successfully");
      setShowUpdatePaymentModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment method");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleConfirmCancel to use API call
  const handleConfirmCancel = async () => {
    if (!currentSubscriptionId) {
      toast.error("No subscription selected");
      return;
    }

    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/${currentSubscriptionId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel subscription");
      }

      toast.success("Subscription canceled successfully");
      setShowCancelSubscriptionModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleConfirmPlanUpdate to use API call
  const handleConfirmPlanUpdate = async () => {
    if (!currentSubscriptionId || !selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }

    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      // Get current subscription
      const currentSubscription = subscriptionData?.subscriptions.find(
        (s) => s.id === currentSubscriptionId
      );

      if (!currentSubscription) {
        throw new Error("Subscription not found");
      }

      // Verify we're not selecting the same plan
      if (currentSubscription.planId === selectedPlanId) {
        toast.info("You are already on this plan");
        setShowUpdatePlanModal(false);
        setIsProcessing(false);
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/${currentSubscriptionId}/update`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            newPriceId: selectedPlanId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update subscription plan"
        );
      }

      toast.success("Subscription plan updated successfully");
      setShowUpdatePlanModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update subscription plan");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleConfirmBillingUpdate to use API call
  const handleConfirmBillingUpdate = async () => {
    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      if (!subscriptionData?.customer?.id) {
        throw new Error("Customer information is missing");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/customer/${subscriptionData.customer.id}/billing`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            name: billingFormData.name,
            email: billingFormData.email,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update billing information"
        );
      }

      toast.success("Customer information updated successfully!");
      setShowUpdateBillingModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update billing information");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/${subscriptionId}/reactivate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to reactivate subscription"
        );
      }

      toast.success("Subscription reactivated successfully");
      await fetchSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reactivate subscription");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleMakeDefaultPaymentMethod to use API call
  const handleMakeDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      if (!subscriptionData?.customer?.id) {
        throw new Error("Customer information is missing");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/payment-methods/${subscriptionData.customer.id}/default`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            paymentMethodId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to set default payment method"
        );
      }

      toast.success("Default payment method updated successfully");
      await fetchSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to set default payment method");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleDeletePaymentMethod to use API call
  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (
      !window.confirm("Are you sure you want to delete this payment method?")
    ) {
      return;
    }

    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(
        `${baseUrl}/api/app/subscription/payment-methods/${paymentMethodId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete payment method");
      }

      toast.success("Payment method deleted successfully");
      await fetchSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payment method");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler methods
  const handleUpdatePayment = (subscriptionId: string) => {
    const subscription = subscriptionData?.subscriptions.find(
      (s) => s.id === subscriptionId
    );

    if (!subscription) {
      toast.error("Subscription not found");
      return;
    }

    setCurrentSubscriptionId(subscriptionId);
    if (subscription.paymentMethod) {
      setSelectedPaymentMethodId(subscription.paymentMethod.id);
    }
    setShowUpdatePaymentModal(true);
  };

  const handleShowCancelSubscription = (subscriptionId: string) => {
    const subscription = subscriptionData?.subscriptions.find(
      (s) => s.id === subscriptionId
    );

    if (!subscription) {
      toast.error("Subscription not found");
      return;
    }

    setCurrentSubscriptionId(subscriptionId);
    const formattedDate = new Date(subscription.renewalDate).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    setBillingEndDate(formattedDate);
    setShowCancelSubscriptionModal(true);
  };

  const handleShowUpdatePlan = (subscriptionId: string) => {
    try {
      const subscription = subscriptionData?.subscriptions.find(
        (s) => s.id === subscriptionId
      );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Set the current subscription ID to state
      setCurrentSubscriptionId(subscriptionId);

      // Pre-select the current plan
      setSelectedPlanId(subscription.planId);

      // Show the modal
      setShowUpdatePlanModal(true);
    } catch (error: any) {
      console.error("Error showing update plan modal:", error);
      toast.error(error.message || "Failed to load plan options");
    }
  };

  const handleShowUpdateBilling = () => {
    if (subscriptionData?.customer) {
      setBillingFormData({
        name: subscriptionData.customer.name || "",
        email: subscriptionData.customer.email || "",
      });
    }
    setShowUpdateBillingModal(true);
  };

  // Handle rendering with error boundary
  try {
    if (renderError) {
      return (
        <div className="container py-5">
          <div className="alert alert-danger">
            <div className="d-flex align-items-center">
              <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
              <div>
                An error occurred while rendering the page. Please try
                refreshing the browser.
              </div>
            </div>
            {renderError && (
              <div className="mt-3 border-top pt-3">
                <pre className="text-danger">{renderError}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="d-flex justify-content-center align-items-center h-100vh py-5 my-5">
          <ThreeDots
            height="80"
            width="80"
            radius="9"
            color="#4fa94d"
            ariaLabel="three-dots-loading"
            visible={true}
          />
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="container py-5">
          <div className="alert alert-danger">
            <div className="d-flex align-items-center">
              <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
              <div>{errorMessage}</div>
            </div>
          </div>
        </div>
      );
    }

    if (!subscriptionData) {
      return (
        <div className="container py-5">
          <div className="alert alert-warning">
            <div className="d-flex align-items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <div>No subscription data available.</div>
            </div>
          </div>
        </div>
      );
    }

    // The existing return statement with all the UI components remains the same
    return (
      <div className="bg-light min-vh-100">
        {/* Toast Container */}
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />

        {/* Simplified Navigation Bar */}
        <nav className="bg-white border-bottom mb-3">
          <div className="container py-2">
            <div className="d-flex align-items-center">
              <a className="text-dark d-flex align-items-center text-decoration-none">
                <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
              </a>
              <h5 className="mb-0 mx-auto">Subscriptions</h5>
            </div>
          </div>
        </nav>

        <div className="container pb-4">
          {/* Subscriptions Section */}
          <Accordion defaultActiveKey="0" className="mb-3">
            <Accordion.Item eventKey="0" className="border">
              <Accordion.Header>
                <span className="fw-medium">Subscriptions</span>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                <div className="border-bottom pb-2 pt-2 px-3 bg-light">
                  <span className="fw-medium">Active Subscriptions</span>
                </div>

                {/* Active Subscriptions */}
                {subscriptionData.subscriptions
                  .filter(
                    (sub) =>
                      sub.status === "active" ||
                      sub.status === "trialing" ||
                      sub.status === "past_due" ||
                      sub.isInGracePeriod ||
                      (sub.status === "active" && sub.isCollectionPaused)
                  )
                  .map((subscription) => (
                    <div key={subscription.id} className="border-bottom p-3">
                      <div className="d-flex justify-content-between">
                        <div className="d-flex align-items-center">
                          <div
                            className="me-3"
                            style={{
                              width: "50px",
                              height: "50px",
                              flexShrink: 0,
                            }}
                          >
                            {subscription.device?.deviceImage ? (
                              <img
                                src={subscription.device.deviceImage}
                                alt="Device"
                                className="w-100 h-100 rounded-circle"
                                style={{
                                  objectFit: "cover",
                                  border: "1px solid #dee2e6",
                                }}
                              />
                            ) : (
                              <div className="bg-primary rounded-circle d-flex justify-content-center align-items-center w-100 h-100">
                                <FontAwesomeIcon
                                  icon={faCube}
                                  className="text-white"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="fw-bold">
                              {subscription.device?.deviceName ||
                                "Unknown Device"}
                            </div>
                            <div className="d-flex align-items-center">
                              <small className="text-muted me-2">
                                Monthly Plan
                              </small>
                              <small className="badge bg-success rounded-pill px-2 py-1">
                                Active
                              </small>
                            </div>
                            <div className="fw-medium">
                              ${subscription.amount} per {subscription.interval}
                            </div>
                            <div className="text-muted small">
                              {subscription.cancelStatus
                                ? `Available until ${new Date(subscription.renewalDate).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}`
                                : `Renews on ${new Date(subscription.renewalDate).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}`}
                              {subscription.cancelAt && !subscription.cancelStatus && (
                                <div>
                                  Cancels on: {new Date(subscription.cancelAt).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </div>
                              )}
                            </div>
                            
                            {subscription.isInGracePeriod && subscription.gracePeriodMessage && (
                              <div className="alert alert-warning mt-2 mb-0 py-2 px-3 small">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                {subscription.gracePeriodMessage}
                              </div>
                            )}
                            
                            {subscription.paymentMethod && (
                              <div className="text-muted mt-1 d-flex align-items-center">
                                <FontAwesomeIcon
                                  icon={getCardIcon(
                                    subscription.paymentMethod.brand
                                  )}
                                  className="me-1"
                                  size="sm"
                                />
                                <span className="me-2">
                                  ****{subscription.paymentMethod.last4}
                                </span>
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleUpdatePayment(subscription.id);
                                  }}
                                  style={{ color: "#6c757d" }}
                                >
                                  <FontAwesomeIcon
                                    icon={faPencilAlt}
                                    size="xs"
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="d-flex gap-2 align-items-end">
                          {!subscription.cancelStatus ? (
                            <>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={() =>
                                  handleShowCancelSubscription(subscription.id)
                                }
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={() =>
                                  handleShowUpdatePlan(subscription.id)
                                }
                              >
                                Update
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={() =>
                                  handleReactivateSubscription(subscription.id)
                                }
                              >
                                Renew
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={() =>
                                  handleShowUpdatePlan(subscription.id)
                                }
                              >
                                Update
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                {/* No active subscriptions message */}
                {subscriptionData.subscriptions.filter(
                  (sub) =>
                    sub.status === "active" ||
                    sub.status === "trialing" ||
                    sub.status === "past_due" ||
                    sub.isInGracePeriod ||
                    (sub.status === "active" && sub.isCollectionPaused)
                ).length === 0 && (
                  <div className="p-3 text-center text-muted">
                    No active subscriptions found.
                  </div>
                )}

                <div className="border-bottom pb-2 pt-3 px-3 bg-light">
                  <span className="fw-medium">Inactive Subscriptions</span>
                </div>

                {/* Inactive Subscriptions */}
                {subscriptionData.subscriptions
                  .filter(
                    (sub) =>
                      sub.status !== "active" &&
                      sub.status !== "trialing" &&
                      sub.status !== "past_due" &&
                      !sub.isInGracePeriod &&
                      !(sub.status === "active" && sub.isCollectionPaused)
                  )
                  .map((subscription) => (
                    <div key={subscription.id} className="border-bottom p-3">
                      <div className="d-flex justify-content-between">
                        <div className="d-flex align-items-center">
                          <div
                            className="bg-secondary rounded-circle d-flex justify-content-center align-items-center me-3"
                            style={{
                              width: "40px",
                              height: "40px",
                              flexShrink: 0,
                            }}
                          >
                            {subscription.device?.deviceImage ? (
                              <img
                                src={subscription.device.deviceImage}
                                alt="Device"
                                className="w-100 h-100 rounded-circle"
                              />
                            ) : (
                              <FontAwesomeIcon
                                icon={faCube}
                                className="text-white"
                              />
                            )}
                          </div>
                          <div>
                            <div className="fw-bold">
                              {subscription.device?.deviceName ||
                                "Unknown Device"}
                            </div>
                            <div className="d-flex align-items-center">
                              <small className="text-muted me-2">
                                Monthly Plan
                              </small>
                              <small className="badge bg-secondary rounded-pill">
                                Inactive
                              </small>
                            </div>
                            <div className="fw-medium">
                              ${subscription.amount} per {subscription.interval}
                            </div>
                            <div className="text-muted small">
                              Ended on{" "}
                              {new Date(
                                subscription.renewalDate
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-end">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              handleReactivateSubscription(subscription.id)
                            }
                            disabled={isProcessing}
                          >
                            {isProcessing ? "Processing..." : "Renew"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* No inactive subscriptions message */}
                {subscriptionData.subscriptions.filter(
                  (sub) =>
                    sub.status !== "active" &&
                    sub.status !== "trialing" &&
                    sub.status !== "past_due" &&
                    !sub.isInGracePeriod &&
                    !(sub.status === "active" && sub.isCollectionPaused)
                ).length === 0 && (
                  <div className="p-3 text-center text-muted">
                    No inactive subscriptions found.
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          {/* Payment Methods Section */}
          <Accordion defaultActiveKey="0" className="mb-3">
            <Accordion.Item eventKey="0" className="border">
              <Accordion.Header>
                <span className="fw-medium">Payment Methods</span>
              </Accordion.Header>
              <Accordion.Body className="p-3">
                {/* Display Payment Methods */}
                {subscriptionData.paymentMethods.length > 0 ? (
                  <div className="payment-methods-list">
                    {subscriptionData.paymentMethods.map(
                      (method: PaymentMethod) => (
                        <div
                          key={method.id}
                          className="payment-method d-flex justify-content-between align-items-center py-2 border-bottom"
                        >
                          <div className="payment-info d-flex align-items-center">
                            <div className="card-icon me-3">
                              <FontAwesomeIcon
                                icon={getCardIcon(method.brand)}
                                size="lg"
                                className="text-dark"
                              />
                            </div>
                            <div className="card-details">
                              <div className="card-number">
                                {getCardLabel(method.brand)} ending in{" "}
                                {method.last4}
                                {method.isDefault && (
                                  <Badge
                                    bg="primary"
                                    className="ms-2 rounded-pill"
                                  >
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <div className="card-expiry text-muted small">
                                Expires {method.expMonth}/{method.expYear}
                              </div>
                            </div>
                          </div>
                          <div className="payment-actions">
                            <div className="dropdown">
                              <button
                                className="btn btn-link text-dark p-1 dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                id={`dropdown-${method.id}`}
                              >
                                <FontAwesomeIcon icon={faEllipsisV} />
                              </button>
                              <ul
                                className="dropdown-menu dropdown-menu-end"
                                aria-labelledby={`dropdown-${method.id}`}
                              >
                                {!method.isDefault && (
                                  <li>
                                    <button
                                      className="dropdown-item"
                                      type="button"
                                      onClick={() =>
                                        handleMakeDefaultPaymentMethod(
                                          method.id
                                        )
                                      }
                                    >
                                      <FontAwesomeIcon
                                        icon={faCheck}
                                        className="me-2"
                                      />
                                      Make Default
                                    </button>
                                  </li>
                                )}
                                <li>
                                  <button
                                    className="dropdown-item text-danger"
                                    type="button"
                                    onClick={() =>
                                      handleDeletePaymentMethod(method.id)
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={faTrash}
                                      className="me-2"
                                    />
                                    Delete
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                    <div
                      className="add-payment-btn mt-3 d-flex align-items-center cursor-pointer"
                      onClick={() => handleAddPaymentMethod()}
                      style={{ cursor: "pointer" }}
                    >
                      <FontAwesomeIcon icon={faPlus} className="me-2" />
                      <span>Add payment method</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="add-payment-btn d-flex align-items-center cursor-pointer"
                    onClick={() => handleAddPaymentMethod()}
                    style={{ cursor: "pointer" }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    <span>Add payment method</span>
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          {/* Billing Information Section */}
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
                  <div>{subscriptionData.customer.name || "Not available"}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Email</div>
                  <div>
                    {subscriptionData.customer.email || "Not available"}
                  </div>
                </div>
                <div>
                  <Button
                    variant="link"
                    className="text-decoration-none text-primary p-0"
                    onClick={handleShowUpdateBilling}
                  >
                    <FontAwesomeIcon icon={faPencilAlt} className="me-2" />
                    Update information
                  </Button>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          {/* Invoice History Section */}
          <Accordion defaultActiveKey="0" className="mb-3">
            <Accordion.Item eventKey="0" className="border">
              <Accordion.Header>
                <span className="fw-medium">Invoice History</span>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                {isLoadingInvoices &&
                (!subscriptionData.invoices ||
                  !subscriptionData.invoices.data ||
                  subscriptionData.invoices.data.length === 0) ? (
                  <div className="text-center py-3" id="invoice-loading">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : subscriptionData.invoices &&
                  subscriptionData.invoices.data &&
                  subscriptionData.invoices.data.length > 0 ? (
                  <div id="invoices-container" className="px-3">
                    {/* Display visible invoices */}
                    {subscriptionData.invoices.data.map((invoice: Invoice, index: number) => (
                      <div
                        key={`${invoice.id}-${index}`}
                        className="invoice d-flex justify-content-between align-items-center py-2 border-bottom"
                      >
                        <div className="invoice-date">
                          {new Date(invoice.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="invoice-amount">
                          ${parseFloat(invoice.amount).toFixed(2)}
                        </div>
                        <div className="invoice-status-container text-center">
                          <span className="invoice-status badge rounded-pill bg-success">
                            {invoice.status === 'paid' ? 'Paid' : invoice.status}
                          </span>
                        </div>
                        <div className="invoice-link">
                          {invoice.url && (
                            <a
                              href={invoice.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FontAwesomeIcon icon={faExternalLinkAlt} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Show View More button if there are more invoices to show */}
                    {subscriptionData.invoices.hasMore && (
                      <div
                        className="text-center py-3"
                        id="load-more-container"
                      >
                        <button
                          className="btn btn-link text-decoration-none"
                          onClick={loadMoreInvoices}
                        >
                          {isLoadingInvoices ? (
                            <>
                              <Spinner
                                animation="border"
                                size="sm"
                                className="me-2"
                              />
                              Loading...
                            </>
                          ) : (
                            "View More"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div id="no-invoices-message" className="text-center py-3">
                    <p className="text-muted mb-0">No invoices found.</p>
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </div>

        {/* All Modals */}
        {/* Add Payment Method Modal */}
        <Modal
          show={showAddPaymentModal}
          onHide={() => setShowAddPaymentModal(false)}
          backdrop="static"
          keyboard={false}
          className="payment-method-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>Add Payment Method</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {stripePromise && clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#007bff",
                      colorBackground: "#ffffff",
                      colorText: "#424770",
                      colorDanger: "#dc3545",
                      fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                      spacingUnit: "4px",
                      borderRadius: "4px",
                    },
                    rules: {
                      ".Tab": {
                        border: "1px solid #e6e6e6",
                        boxShadow: "0px 1px 1px rgba(0, 0, 0, 0.03)",
                        marginBottom: "8px",
                      },
                      ".Tab--selected": {
                        color: "#007bff",
                        border: "1px solid #007bff",
                      },
                      ".Label": {
                        fontWeight: "500",
                      },
                      ".Input": {
                        padding: "10px 14px",
                      },
                    },
                  },
                  fonts: [
                    {
                      cssSrc:
                        "https://fonts.googleapis.com/css?family=Roboto:400,500,600",
                    },
                  ],
                  locale: "auto",
                }}
              >
                <CheckoutForm
                  onSuccess={() => {
                    setShowAddPaymentModal(false);
                    fetchSubscriptionData();
                  }}
                  customerId={subscriptionData?.customer?.id || ""}
                />
              </Elements>
            ) : (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
                <div className="mt-3">Initializing payment form...</div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowAddPaymentModal(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Update Payment Method Modal */}
        <Modal
          show={showUpdatePaymentModal}
          onHide={() => setShowUpdatePaymentModal(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Update Payment Method</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {subscriptionData.paymentMethods.length > 0 ? (
              <>
                <div className="mb-3">
                  <h6 className="mb-3">Select payment method</h6>
                  {subscriptionData.paymentMethods.map(
                    (method: PaymentMethod) => (
                      <div
                        key={method.id}
                        className={`p-3 border rounded mb-2 d-flex align-items-center ${
                          selectedPaymentMethodId === method.id
                            ? "border-primary bg-light"
                            : ""
                        }`}
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center flex-grow-1">
                          <div className="me-3">
                            <FontAwesomeIcon
                              icon={getCardIcon(method.brand)}
                              size="lg"
                              className={`${
                                selectedPaymentMethodId === method.id
                                  ? "text-primary"
                                  : "text-secondary"
                              }`}
                            />
                          </div>
                          <div>
                            <div
                              className={`fw-medium ${
                                selectedPaymentMethodId === method.id
                                  ? "text-primary"
                                  : ""
                              }`}
                            >
                              {method.brand.charAt(0).toUpperCase() +
                                method.brand.slice(1)}{" "}
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
                          onChange={() => setSelectedPaymentMethodId(method.id)}
                          className="ms-3"
                        />
                      </div>
                    )
                  )}
                </div>
                <h6 className="mb-3">Or add a new payment method</h6>
                <div
                  className="d-flex align-items-center justify-content-center text-primary border border-dashed p-3 rounded cursor-pointer"
                  onClick={() => {
                    setShowUpdatePaymentModal(false);
                    handleAddPaymentMethod();
                  }}
                  style={{ cursor: "pointer", minHeight: "60px" }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
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
                    setShowUpdatePaymentModal(false);
                    handleAddPaymentMethod();
                  }}
                  style={{ cursor: "pointer", minHeight: "60px" }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  <span>Add payment method</span>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowUpdatePaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitUpdatePayment}
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

        {/* Cancel Subscription Modal */}
        <Modal
          show={showCancelSubscriptionModal}
          onHide={() => setShowCancelSubscriptionModal(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Cancel Subscription</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center mb-4">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="text-warning"
                size="3x"
              />
            </div>
            <p className="mb-3">
              Are you sure you want to cancel your subscription?
            </p>
            <div className="alert alert-info">
              <p className="mb-0">
                Your subscription will remain active until the end of your
                billing period on{" "}
                <span className="fw-bold">{billingEndDate}</span>.
              </p>
            </div>
            <p className="text-muted">
              You can renew your subscription at any time before the end of your
              billing period.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowCancelSubscriptionModal(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
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
                "Cancel Subscription"
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Update Subscription Plan Modal */}
        <Modal
          show={showUpdatePlanModal}
          onHide={() => setShowUpdatePlanModal(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Update Subscription Plan</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {subscriptionData?.plans && subscriptionData.plans.length > 0 ? (
              <div>
                <h6 className="mb-3">Select a plan</h6>
                <div id="available-plans-list">
                  {subscriptionData.plans.map((plan: Plan) => {
                    // Get current subscription plan to show comparisons
                    const currentSubscription =
                      subscriptionData?.subscriptions.find(
                        (s) => s.id === currentSubscriptionId
                      );
                    const isCurrentPlan =
                      currentSubscription?.planId === plan.id;

                    return (
                      <div
                        key={plan.id}
                        className={`p-3 border rounded mb-3 ${
                          selectedPlanId === plan.id
                            ? "border-primary bg-light"
                            : ""
                        }`}
                        onClick={() => setSelectedPlanId(plan.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <Form.Check
                              type="radio"
                              id={`plan-${plan.id}`}
                              name="subscription-plan"
                              className="me-3"
                              checked={selectedPlanId === plan.id}
                              onChange={() => setSelectedPlanId(plan.id)}
                            />
                            <div>
                              <div
                                className={`fw-medium ${
                                  selectedPlanId === plan.id
                                    ? "text-primary"
                                    : ""
                                }`}
                              >
                                {plan.name}
                                {isCurrentPlan && (
                                  <Badge bg="success" className="ms-2">
                                    Current Plan
                                  </Badge>
                                )}
                              </div>
                              {plan.description && (
                                <small className="text-muted d-block">
                                  {plan.description}
                                </small>
                              )}
                            </div>
                          </div>
                          <div
                            className={`fw-bold ${
                              selectedPlanId === plan.id ? "text-primary" : ""
                            }`}
                          >
                            ${parseFloat(plan.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="alert alert-info mt-4">
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  Your subscription will be updated immediately. You'll be
                  charged the prorated amount for the remainder of your billing
                  period.
                </div>
              </div>
            ) : (
              <div className="alert alert-info">
                No plans available at this time. Please try again later.
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowUpdatePlanModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmPlanUpdate}
              disabled={isProcessing || !selectedPlanId}
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
                "Update Plan"
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Update Billing Information Modal */}
        <Modal
          show={showUpdateBillingModal}
          onHide={() => setShowUpdateBillingModal(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Update Customer Information</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form id="billing-form">
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  value={billingFormData.name}
                  onChange={(e) =>
                    setBillingFormData({
                      ...billingFormData,
                      name: e.target.value,
                    })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={billingFormData.email}
                  onChange={(e) =>
                    setBillingFormData({
                      ...billingFormData,
                      email: e.target.value,
                    })
                  }
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowUpdateBillingModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmBillingUpdate}
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
      </div>
    );
  } catch (error) {
    console.error("Render error:", error);
    setRenderError(
      error instanceof Error ? error.message : "Unknown rendering error"
    );
    return null; // This will be replaced by the error UI on the next render
  }
}
