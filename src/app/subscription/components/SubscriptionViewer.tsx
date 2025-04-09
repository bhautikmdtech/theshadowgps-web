"use client";

import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";

import { SubscriptionData } from "./types";
import SubscriptionsSection from "./SubscriptionsSection";
import PaymentMethodsSection from "./PaymentMethodsSection";
import BillingInformationSection from "./BillingInformationSection";
import InvoiceHistorySection from "./InvoiceHistorySection";
import AddPaymentModal from "./AddPaymentModal";
import { SubscriptionService } from "./subscriptionService";

declare global {
  interface Window {
    Stripe?: import("@stripe/stripe-js").StripeConstructor;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

type SubscriptionViewerProps = {
  token: string;
  initialData?: {
    data: SubscriptionData;
  };
};

const BackButton = () => {
  const closeWindow = () => {
    if (window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ action: "close", manual: true })
        );
      } catch (e) {
        console.error("Error posting close action:", e);
      }
    } else {
      window.close();
    }
  };

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        closeWindow();
      }}
      className="text-decoration-none"
    >
      <FaChevronLeft className="me-2" />
    </a>
  );
};

export default function SubscriptionViewer({
  token,
  initialData,
}: SubscriptionViewerProps) {
  console.log(initialData)
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(initialData?.data || null);
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);
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
    if (stripeInitialized || !publishableKey) return false;

    try {
      const promise = loadStripe(publishableKey);
      setStripePromise(promise);
      setClientSecret(clientSecret);
      setStripeInitialized(true);
      return true;
    } catch {
      toast.error("Failed to initialize Stripe");
      return false;
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!subscriptionData?.customer?.id) {
      toast.error("Customer information is missing.");
      return;
    }
    const { stripePublishableKey, clientSecret } = subscriptionData;
    if (!stripePublishableKey || !clientSecret) {
      toast.error("Payment configuration is missing.");
      return;
    }

    const initialized = await initializeStripe(
      stripePublishableKey,
      clientSecret
    );
    if (stripePromise && clientSecret) {
      setShowAddPaymentModal(true);
    }
  };

  const refreshSubscriptionData = async () => {
    try {
      const response = await SubscriptionService.getSubscriptionData(token);
      setSubscriptionData(response.data);
    } catch (err: any) {
      toast.error(err?.response?.data || err.message || "Failed to load data");
    }
  };

  if (!subscriptionData) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning d-flex align-items-center">
          <FaExclamationCircle className="me-2" />
          No subscription data available.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-vh-100">
      <nav className="bg-white border-bottom mb-3">
        <div className="container py-2 d-flex align-items-center">
          <BackButton />
          <h5 className="mb-0">Subscription Management</h5>
        </div>
      </nav>

      <div className="container mb-5">
        <SubscriptionsSection
          subscriptions={subscriptionData.subscriptions}
          token={token}
          plans={subscriptionData.plans}
          paymentMethods={subscriptionData.paymentMethods}
          onAddNewPaymentMethod={handleAddPaymentMethod}
          onRefresh={refreshSubscriptionData}
        />

        <PaymentMethodsSection
          token={token}
          paymentMethods={subscriptionData.paymentMethods}
          customer={subscriptionData.customer}
          handleAddPaymentMethod={handleAddPaymentMethod}
          onRefresh={refreshSubscriptionData}
        />

        <BillingInformationSection
          customer={subscriptionData.customer}
          token={token}
          onRefresh={refreshSubscriptionData}
        />

        <InvoiceHistorySection
          invoices={subscriptionData.invoices}
          customer={subscriptionData.customer}
          token={token}
          onRefresh={refreshSubscriptionData}
        />
      </div>

      {showAddPaymentModal && stripePromise && clientSecret && (
        <Elements
          stripe={stripePromise}
          options={
            {
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
              paymentMethodCreation: "manual",
            } as any
          }
        >
          <AddPaymentModal
            show={showAddPaymentModal}
            onClose={() => setShowAddPaymentModal(false)}
            onRefresh={refreshSubscriptionData}
            customerId={subscriptionData.customer.id}
          />
        </Elements>
      )}
    </div>
  );
}
