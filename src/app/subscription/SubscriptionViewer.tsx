"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Form,
  Spinner,
  Badge,
  Accordion,
} from "react-bootstrap";
import {
  FaChevronLeft,
  FaExclamationCircle,
  FaCube,
  FaEdit,
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaCreditCard,
  FaPlus,
  FaEllipsisV,
  FaCheck,
  FaTrash,
  FaInfoCircle,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover,
  FaCcDinersClub,
  FaCcJcb,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ThreeDots } from "react-loader-spinner";
import axiosClient from "@/lib/axiosClient";

// Import types from the shared types file
import {
  Customer,
  PaymentMethod,
  Device,
  Subscription,
  Plan,
  Invoice,
  SubscriptionData,
} from "./types";

// Import modular components
import SubscriptionsSection from "./SubscriptionsSection";
import PaymentMethodsSection from "./PaymentMethodsSection";
import BillingInformationSection from "./BillingInformationSection";
import InvoiceHistorySection from "./InvoiceHistorySection";
import AddPaymentModal from "./AddPaymentModal";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import ReactivateSubscriptionModal from "./ReactivateSubscriptionModal";
import UpdatePlanModal from "./UpdatePlanModal";
import UpdateBillingModal from "./UpdateBillingModal";
import UpdatePaymentModal from "./UpdatePaymentModal";

// Declare Stripe types for TypeScript
declare global {
  interface Window {
    Stripe?: import("@stripe/stripe-js").StripeConstructor;
  }
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
            <FaExclamationCircle className="me-2" />
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
  const [showReactivateModal, setShowReactivateModal] = useState(false);
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
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    // Set base URL for API calls
    setBaseUrl(window.location.origin);
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setIsLoading(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await axiosClient.get(
        "/api/app/subscription/getStripeData",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      const data = response.data;
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
      const errorMessage =
        error.response?.data ||
        error.message ||
        "Failed to load subscription data";
      setErrorMessage(
        typeof errorMessage === "string"
          ? errorMessage
          : "Failed to load subscription data"
      );
      toast.error(
        typeof errorMessage === "string"
          ? errorMessage
          : "Failed to load subscription data"
      );
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

      const response = await axiosClient.get(
        `/api/app/subscription/invoices/${subscriptionData.customer.id}?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      const data = response.data;

      setSubscriptionData((prevData) => {
        if (!prevData) return null;

        // Get existing invoices
        const existingInvoices = prevData.invoices?.data || [];
        const existingIds = new Set(existingInvoices.map((inv) => inv.id));

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
      const errorMessage =
        error.response?.data || error.message || "Failed to load invoices";
      toast.error(
        typeof errorMessage === "string"
          ? errorMessage
          : "Failed to load invoices"
      );
    } finally {
      setIsLoadingInvoices(false);
    }
  };

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

  // Handle payment method submission via AddPaymentModal
  const handlePaymentMethodSuccess = async () => {
    setShowAddPaymentModal(false);
    await fetchSubscriptionData();
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

      const response = await axiosClient.put(
        `/api/app/subscription/${currentSubscriptionId}/payment-method`,
        {
          paymentMethodId: selectedPaymentMethodId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Payment method updated successfully");
      setShowUpdatePaymentModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update payment method";
      toast.error(errorMessage);
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

      const response = await axiosClient.post(
        `/api/app/subscription/${currentSubscriptionId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Subscription canceled successfully");
      setShowCancelSubscriptionModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to cancel subscription";
      toast.error(errorMessage);
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

      const response = await axiosClient.put(
        `/api/app/subscription/${currentSubscriptionId}/update`,
        {
          newPriceId: selectedPlanId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Subscription plan updated successfully");
      setShowUpdatePlanModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update subscription plan";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleConfirmBillingUpdate to use API call
  const handleConfirmBillingUpdate = async (data: {
    name: string;
    email: string;
  }) => {
    try {
      setIsProcessing(true);

      const token = getTokenFromUrl();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      if (!subscriptionData?.customer?.id) {
        throw new Error("Customer information is missing");
      }

      const response = await axiosClient.put(
        `/api/app/subscription/customer/${subscriptionData.customer.id}/billing`,
        {
          name: data.name,
          email: data.email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Customer information updated successfully!");
      setShowUpdateBillingModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update billing information";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    setCurrentSubscriptionId(subscriptionId);
    setShowReactivateModal(true);
  };

  const confirmReactivateSubscription = async () => {
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

      const response = await axiosClient.post(
        `/api/app/subscription/${currentSubscriptionId}/reactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Subscription reactivated successfully");
      setShowReactivateModal(false);
      await fetchSubscriptionData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to reactivate subscription";
      toast.error(errorMessage);
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

      const response = await axiosClient.put(
        `/api/app/subscription/payment-methods/${subscriptionData.customer.id}/default`,
        {
          paymentMethodId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Default payment method updated successfully");
      await fetchSubscriptionData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to set default payment method";
      toast.error(errorMessage);
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

      const response = await axiosClient.delete(
        `/api/app/subscription/payment-methods/${paymentMethodId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      toast.success("Payment method deleted successfully");
      await fetchSubscriptionData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete payment method";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean up handleUpdatePayment function
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
    } else {
      setBillingFormData({
        name: "",
        email: "",
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
              <FaExclamationCircle className="me-2" />
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
              <FaExclamationCircle className="me-2" />
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
              <FaExclamationCircle className="me-2" />
              <div>No subscription data available.</div>
            </div>
          </div>
        </div>
      );
    }

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
                <FaChevronLeft className="me-2" />
              </a>
              <h5 className="mb-0 mx-auto">Subscriptions</h5>
            </div>
          </div>
        </nav>

        <div className="container pb-4">
          {/* Subscriptions Section */}
          <SubscriptionsSection
            subscriptions={subscriptionData.subscriptions}
            onUpdatePayment={handleUpdatePayment}
            onCancelSubscription={handleShowCancelSubscription}
            onUpdatePlan={handleShowUpdatePlan}
            onReactivateSubscription={handleReactivateSubscription}
            isProcessing={isProcessing}
            getCardIcon={getCardIcon}
          />

          {/* Payment Methods Section */}
          <PaymentMethodsSection
            paymentMethods={subscriptionData.paymentMethods}
            handleAddPaymentMethod={handleAddPaymentMethod}
            handleMakeDefaultPaymentMethod={handleMakeDefaultPaymentMethod}
            handleDeletePaymentMethod={handleDeletePaymentMethod}
            isProcessing={isProcessing}
          />

          {/* Billing Information Section */}
          <BillingInformationSection
            customer={subscriptionData.customer}
            onUpdateBilling={handleShowUpdateBilling}
          />

          {/* Invoice History Section */}
          <InvoiceHistorySection
            invoices={subscriptionData.invoices}
            isLoadingInvoices={isLoadingInvoices}
            loadMoreInvoices={loadMoreInvoices}
          />
        </div>

        {/* Modals */}
        {/* Add Payment Method Modal */}
        {showAddPaymentModal && stripePromise && clientSecret && (
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
              },
            }}
          >
            <AddPaymentModal
              show={showAddPaymentModal}
              onClose={() => setShowAddPaymentModal(false)}
              onSuccess={handlePaymentMethodSuccess}
              customerId={subscriptionData.customer.id}
              baseUrl={baseUrl}
              getToken={getTokenFromUrl}
            />
          </Elements>
        )}

        {/* Cancel Subscription Modal */}
        <CancelSubscriptionModal
          show={showCancelSubscriptionModal}
          onClose={() => setShowCancelSubscriptionModal(false)}
          onConfirm={handleConfirmCancel}
          isProcessing={isProcessing}
          billingEndDate={billingEndDate}
        />

        {/* Reactivate Subscription Modal */}
        <ReactivateSubscriptionModal
          show={showReactivateModal}
          onClose={() => setShowReactivateModal(false)}
          onConfirm={confirmReactivateSubscription}
          isProcessing={isProcessing}
        />

        {/* Update Plan Modal */}
        <UpdatePlanModal
          show={showUpdatePlanModal}
          onClose={() => setShowUpdatePlanModal(false)}
          onConfirm={handleConfirmPlanUpdate}
          isProcessing={isProcessing}
          plans={subscriptionData.plans}
          currentPlanId={
            currentSubscriptionId
              ? subscriptionData.subscriptions.find(
                  (s) => s.id === currentSubscriptionId
                )?.planId || null
              : null
          }
          selectedPlanId={selectedPlanId}
          onPlanSelect={(planId: string) => setSelectedPlanId(planId)}
        />

        {/* Update Billing Modal */}
        <UpdateBillingModal
          show={showUpdateBillingModal}
          onClose={() => setShowUpdateBillingModal(false)}
          onConfirm={handleConfirmBillingUpdate}
          isProcessing={isProcessing}
          initialData={billingFormData}
        />

        {/* Update Payment Method Modal */}
        <UpdatePaymentModal
          show={showUpdatePaymentModal}
          onClose={() => setShowUpdatePaymentModal(false)}
          onConfirm={handleSubmitUpdatePayment}
          isProcessing={isProcessing}
          paymentMethods={subscriptionData.paymentMethods}
          selectedPaymentMethodId={selectedPaymentMethodId}
          onPaymentMethodSelect={(id: string) => setSelectedPaymentMethodId(id)}
          onAddNewPaymentMethod={handleAddPaymentMethod}
          getCardIcon={getCardIcon}
        />
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
