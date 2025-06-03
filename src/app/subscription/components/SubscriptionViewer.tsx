"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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
  const [refreshing, setRefreshing] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const prevScrollY = useRef(0);
  const pullStartY = useRef(0);
  const pullMoveY = useRef(0);
  const refreshDistance = 100; // Minimum distance to pull for refresh
  const distanceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Set up pull to refresh
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = document.documentElement.scrollTop;
      
      if (scrollTop <= 0) {
        pullStartY.current = e.touches[0].screenY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const scrollTop = document.documentElement.scrollTop;
      
      if (scrollTop <= 0 && pullStartY.current > 0) {
        pullMoveY.current = e.touches[0].screenY;
        const pullDistance = pullMoveY.current - pullStartY.current;
        
        if (pullDistance > 0) {
          e.preventDefault();
          
          if (distanceRef.current && contentRef.current && !refreshing) {
            const distance = Math.min(pullDistance * 0.5, 150);
            distanceRef.current.style.height = `${distance}px`;
            distanceRef.current.style.opacity = (distance / 150).toString();
            contentRef.current.style.transform = `translateY(${distance}px)`;
          }
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (pullStartY.current > 0 && pullMoveY.current > 0) {
        const pullDistance = pullMoveY.current - pullStartY.current;
        
        if (pullDistance > refreshDistance && !refreshing) {
          doRefresh();
        }
        
        // Reset pull distance
        pullStartY.current = 0;
        pullMoveY.current = 0;
        
        // Reset styles
        if (distanceRef.current && contentRef.current) {
          distanceRef.current.style.height = '0px';
          distanceRef.current.style.opacity = '0';
          contentRef.current.style.transform = 'translateY(0)';
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [refreshing]);

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

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSubscriptionData();
      toast.success("Data refreshed");
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 1000); // Give some time for the refresh animation
    }
  }, []);

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

      {/* Pull to refresh indicator */}
      <div 
        ref={distanceRef} 
        className="pull-to-refresh-indicator"
        style={{
          height: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          opacity: 0,
          transition: refreshing ? 'none' : 'all 0.3s ease',
          position: 'relative',
          zIndex: 5
        }}
      >
        <div className={`refresh-spinner ${refreshing ? 'spinning' : ''}`}>
          {refreshing ? 'Refreshing...' : 'Pull to refresh'}
        </div>
      </div>

      <div 
        ref={contentRef}
        style={{
          transition: refreshing ? 'none' : 'transform 0.3s ease',
          transform: 'translateY(0)'
        }}
      >
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
