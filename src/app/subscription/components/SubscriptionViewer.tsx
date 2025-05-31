"use client";

import React, { useEffect, useState, useRef } from "react";
import { FaChevronLeft, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Navbar } from "react-bootstrap";

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

interface APIError extends Error {
  response?: {
    data?: string;
  };
}

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
  console.log(initialData);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(initialData?.data || null);
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isNavFixed, setIsNavFixed] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const prevScrollY = useRef(0);

  // Handle scroll for fixed navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 100) {
        // Only set state if it changes
        if (!isNavFixed) setIsNavFixed(true);
      } else {
        // Only set state if it changes
        if (isNavFixed) setIsNavFixed(false);
      }

      prevScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isNavFixed]);

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

    await initializeStripe(stripePublishableKey, clientSecret);
    if (stripePromise && clientSecret) {
      setShowAddPaymentModal(true);
    }
  };

  const refreshSubscriptionData = async () => {
    try {
      const response = await SubscriptionService.getSubscriptionData(token);
      setSubscriptionData(response?.data);
    } catch (err: unknown) {
      const error = err as APIError;
      toast.error(
        error?.response?.data || error.message || "Failed to load data"
      );
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
      <Navbar
        ref={navbarRef}
        className={`bg-white border-bottom transition-all duration-300 ${
          isNavFixed ? "fixed-top shadow-sm animate-slideDown" : ""
        }`}
        style={{
          height: "58px",
          zIndex: 1030,
          transition: "transform 0.3s ease-in-out",
          transform: isNavFixed ? "translateY(0)" : "",
        }}
      >
        <div className="container d-flex align-items-center h-100 px-4">
          {/* <div>
            <BackButton />
          </div> */}
          <h5
            className="mb-0"
            style={{
              color: "#0C1F3F",
              fontSize: "18px",
              fontWeight: "500",
            }}
          >
            Subscription Management
          </h5>
        </div>
      </Navbar>

      {isNavFixed && <div style={{ height: "58px" }} />}

      <div className="container mb-5 mt-3">
        <SubscriptionsSection
          customer={subscriptionData.customer}
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
            } as StripeElementsOptions
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
