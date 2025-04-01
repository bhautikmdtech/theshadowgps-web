"use client";

import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaExclamationCircle } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import axiosClient from "@/lib/axiosClient";
import { AiOutlineReload } from "react-icons/ai";

// Import types from the shared types file
import { Invoice, SubscriptionData } from "./types";

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
import Link from "next/link";

// Declare Stripe types for TypeScript
declare global {
  interface Window {
    Stripe?: import("@stripe/stripe-js").StripeConstructor;
  }
}
type SubscriptionViewerProps = {
  token: string;
  initialData?: {
    data: SubscriptionData;
  };
};

export default function SubscriptionViewer({
  token,
  initialData,
}: SubscriptionViewerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(initialData?.data || null);
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

  useEffect(() => {
    if (!initialData) {
      refreshSubscriptionData();
    } else if (
      initialData.data.paymentMethods?.length > 0 ||
      (initialData.data.stripePublishableKey && initialData.data.clientSecret)
    ) {
      initializeStripe(
        initialData.data.stripePublishableKey,
        initialData.data.clientSecret
      );
    }
  }, []);

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
    await refreshSubscriptionData();
  };

  // Update handleSubmitUpdatePayment to use API call
  const handleSubmitUpdatePayment = async () => {
    if (!currentSubscriptionId || !selectedPaymentMethodId) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      setIsProcessing(true);

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
      await refreshSubscriptionData();
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
      await refreshSubscriptionData();
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
      await refreshSubscriptionData();
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
      await refreshSubscriptionData();
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
      await refreshSubscriptionData();
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
      await refreshSubscriptionData();
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
      await refreshSubscriptionData();
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

  const refreshSubscriptionData = async () => {
    setIsRefreshing(true);
    try {
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

      return data.data;
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
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

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
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <Link href="/" className="text-decoration-none">
                  <FaChevronLeft className="me-2" />
                </Link>
                <h5 className="mb-0">Subscription Management</h5>
              </div>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={refreshSubscriptionData}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <AiOutlineReload className="animate-spin" />
                  </>
                ) : (
                  <>
                    <AiOutlineReload />
                  </>
                )}
              </button>
            </div>
          </div>
        </nav>

        <div className="container mb-5">
          {/* Subscriptions Section */}
          <SubscriptionsSection
            subscriptions={subscriptionData.subscriptions}
            onUpdatePayment={handleUpdatePayment}
            onCancelSubscription={handleShowCancelSubscription}
            onUpdatePlan={handleShowUpdatePlan}
            onReactivateSubscription={handleReactivateSubscription}
            isProcessing={isProcessing}
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
