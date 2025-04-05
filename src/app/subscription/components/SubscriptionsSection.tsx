import React, { useState } from "react";
import { Accordion, Badge, Button } from "react-bootstrap";
import { FaCube, FaExclamationTriangle } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import Image from "next/image";
import { SubscriptionService } from "./subscriptionService";
import UpdatePaymentModal from "./UpdatePaymentModal";
import UpdatePlanModal from "./UpdatePlanModal";
import { PaymentMethod, Plan, Subscription } from "./types";
import { PageLoader } from "@/components";

interface SubscriptionsSectionProps {
  subscriptions: Subscription[];
  token: string;
  plans: Plan[];
  paymentMethods: PaymentMethod[];
  onAddNewPaymentMethod: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function SubscriptionsSection({
  subscriptions,
  token,
  plans,
  paymentMethods,
  onAddNewPaymentMethod,
  onRefresh,
}: SubscriptionsSectionProps) {
  const [showUpdatePlanModal, setShowUpdatePlanModal] = useState(false);
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<
    string | null
  >(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const confirmCancelSubscription = async (subscriptionId: string) => {
    if (!subscriptionId) return;

    const confirm = window.confirm(
      "Are you sure you want to Cancel this subscription?"
    );

    if (!confirm) return;

    try {
      setIsProcessing(true);
      await SubscriptionService.cancelSubscription(token, subscriptionId);
      await onRefresh();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReactivateSubscription = async (subscriptionId: string) => {
    if (!subscriptionId) return;

    const confirm = window.confirm(
      "Are you sure you want to renew this subscription?"
    );
    if (!confirm) return;

    try {
      setIsProcessing(true);
      await SubscriptionService.reactivateSubscription(token, subscriptionId);
      await onRefresh();
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePlan = async (subscriptionId: string) => {
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    if (subscription) {
      setCurrentSubscriptionId(subscriptionId);
      setCurrentPlanId(subscription.planId);
      setSelectedPlanId(subscription.planId);
      setShowUpdatePlanModal(true);
    }
  };

  const confirmUpdatePlan = async () => {
    if (!currentSubscriptionId || !selectedPlanId) return;

    try {
      setIsProcessing(true);
      await SubscriptionService.updateSubscriptionPlan(
        token,
        currentSubscriptionId,
        selectedPlanId
      );
      await onRefresh();
      setShowUpdatePlanModal(false);
    } catch (error) {
      console.error("Failed to update plan:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePayment = async (subscriptionId: string) => {
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    if (subscription) {
      setCurrentSubscriptionId(subscriptionId);
      setSelectedPaymentMethodId(subscription.paymentMethod?.id || null);
      setShowUpdatePaymentModal(true);
    }
  };

  const confirmUpdatePayment = async () => {
    if (!currentSubscriptionId || !selectedPaymentMethodId) return;

    try {
      setIsProcessing(true);
      await SubscriptionService.updatePaymentMethod(
        token,
        currentSubscriptionId,
        selectedPaymentMethodId
      );
      await onRefresh();
      setShowUpdatePaymentModal(false);
    } catch (error) {
      console.error("Failed to update payment method:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processedSubscriptions = subscriptions.map((subscription: any) => {
    if (subscription.gracePeriodMessage !== undefined) {
      return subscription;
    }

    const transformedSubscription = {
      ...subscription,
    };

    if (subscription.isInGracePeriod) {
      const remainingDays = subscription.gracePeriodRemainingDays || 0;
      const formattedGraceEndDate = subscription.graceEndDate
        ? new Date(subscription.graceEndDate).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          })
        : "";

      let nextPaymentAttemptMessage = "";
      if (subscription.nextPaymentAttempt) {
        const nextAttemptDate = new Date(subscription.nextPaymentAttempt);
        const formattedNextAttempt = nextAttemptDate.toLocaleDateString(
          "en-US",
          {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          }
        );
        nextPaymentAttemptMessage = ` We'll attempt to charge your payment method again on ${formattedNextAttempt}.`;
      }

      let gracePeriodMessage = "";
      if (remainingDays <= 0) {
        gracePeriodMessage = `Your grace period has expired. Please update your payment method to restore service.`;
      } else if (remainingDays === 1) {
        gracePeriodMessage = `Your latest payment has failed. Your service will be interrupted in 1 day if no action is taken. Please update your payment method before ${formattedGraceEndDate} to continue your subscription.${nextPaymentAttemptMessage}`;
      } else {
        gracePeriodMessage = `Your latest payment has failed. Update your payment method to continue this subscription. You have ${remainingDays} days remaining until service interruption on ${formattedGraceEndDate}.${nextPaymentAttemptMessage}`;
      }

      transformedSubscription.isInGracePeriod = true;
      transformedSubscription.graceEndDate = formattedGraceEndDate;
      transformedSubscription.gracePeriodMessage = gracePeriodMessage;
      transformedSubscription.gracePeriodRemainingDays = remainingDays;
    }

    return transformedSubscription;
  });

  const activeSubscriptions = processedSubscriptions.filter(
    (sub) =>
      sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "past_due" ||
      sub.isInGracePeriod ||
      (sub.status === "active" && sub.isCollectionPaused)
  );

  const inactiveSubscriptions = processedSubscriptions.filter(
    (sub) =>
      sub.status !== "active" &&
      sub.status !== "trialing" &&
      sub.status !== "past_due" &&
      !sub.isInGracePeriod &&
      !(sub.status === "active" && sub.isCollectionPaused)
  );

  const getStatusBadge = (subscription: any) => {
    if (subscription.status === "trialing") {
      return (
        <>
          <Badge bg="success" className="ms-md-2">
            Active
          </Badge>{" "}
          <Badge bg="warning" text="dark" className="ms-md-2">
            Free Trial (ends {formatDate(subscription.trialEndDate)})
          </Badge>
        </>
      );
    }

    if (subscription.isInGracePeriod) {
      return (
        <>
          <Badge bg="danger" className="ms-md-2">
            Payment Failed
          </Badge>
          <Badge bg="danger" className="ms-md-2">
            Grace Period
            {subscription.graceEndDate &&
              ` (until ${subscription.graceEndDate})`}
          </Badge>
        </>
      );
    }

    if (
      subscription.status === "past_due" ||
      subscription.paymentStatus === "failed"
    ) {
      return (
        <Badge bg="danger" className="ms-md-2">
          Payment Failed
        </Badge>
      );
    }

    if (subscription.isCollectionPaused) {
      return (
        <Badge bg="danger" className="ms-md-2">
          Payment Paused
          {subscription.resumeAt && ` (until ${subscription.resumeAt})`}
        </Badge>
      );
    }

    if (subscription.isCancelled) {
      return (
        <>
          <Badge bg="success" className="ms-md-2">
            Active
          </Badge>{" "}
          <Badge bg="danger" className="ms-md-2">
            Cancel on {formatDate(subscription.cancelAt || "")}
          </Badge>
        </>
      );
    }

    if (subscription.status === "active") {
      return (
        <Badge bg="success" className="ms-md-2">
          Active
        </Badge>
      );
    }

    if (subscription.status === "canceled") {
      return (
        <Badge bg="secondary" className="ms-md-2">
          Canceled
        </Badge>
      );
    }

    return (
      <Badge bg="secondary" className="ms-md-2">
        {subscription.status.charAt(0).toUpperCase() +
          subscription.status.slice(1)}
      </Badge>
    );
  };

  const formatInterval = (interval: string, intervalCount: number = 1) => {
    let formattedInterval = "Monthly";

    if (interval?.toLowerCase() === "month") {
      formattedInterval =
        intervalCount === 1
          ? "Monthly"
          : intervalCount === 3
          ? "Quarterly"
          : `Every ${intervalCount} months`;
    } else if (interval?.toLowerCase() === "year") {
      formattedInterval =
        intervalCount === 1 ? "Annual" : `Every ${intervalCount} years`;
    } else if (interval?.toLowerCase() === "day") {
      formattedInterval =
        intervalCount === 1
          ? "Daily"
          : intervalCount === 7
          ? "Weekly"
          : intervalCount === 14
          ? "Bi-weekly"
          : `Every ${intervalCount} days`;
    } else if (interval?.toLowerCase() === "week") {
      formattedInterval =
        intervalCount === 1
          ? "Weekly"
          : intervalCount === 2
          ? "Bi-weekly"
          : `Every ${intervalCount} weeks`;
    } else {
      formattedInterval = `Every ${intervalCount} ${interval || "period"}(s)`;
    }

    return formattedInterval;
  };

  const formatDate = (date: string) => {
    try {
      if (!date) return "N/A";
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date:", date);
        return "N/A";
      }
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "N/A";
    }
  };

  const renderActiveSubscriptionButtons = (subscription: Subscription) => {
    if (subscription.isCancelled) {
      return (
        <>
          <Button
            variant="outline-primary"
            className="flex-grow-1"
            style={{ borderRadius: "10px" }}
            onClick={() => confirmReactivateSubscription(subscription.id)}
          >
            {isProcessing ? (
              <>
                <PageLoader type="spinner" size="sm" className="me-2" />
              </>
            ) : (
              "Renew Subscription"
            )}
          </Button>
          <Button
            variant="primary"
            style={{ borderRadius: "10px" }}
            className="flex-grow-1"
            onClick={() => handleUpdatePlan(subscription.id)}
          >
            Update Plan
          </Button>
        </>
      );
    }

    if (
      subscription.status === "past_due" ||
      subscription.isInGracePeriod ||
      subscription.paymentStatus === "failed"
    ) {
      return (
        <>
          <Button
            variant="outline-primary"
            className="flex-grow-1"
            style={{ borderRadius: "10px" }}
            onClick={() => confirmCancelSubscription(subscription.id)}
          >
            {isProcessing ? (
              <>
                <PageLoader type="spinner" size="sm" className="me-2" />
              </>
            ) : (
              "Cancel"
            )}
          </Button>
          <Button
            variant="primary"
            style={{ borderRadius: "10px" }}
            className="flex-grow-1"
            onClick={() => handleUpdatePayment(subscription.id)}
          >
            Update Payment Method
          </Button>
        </>
      );
    }

    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      return (
        <>
          <Button
            variant="outline-primary"
            className="flex-grow-1"
            style={{ borderRadius: "10px" }}
            onClick={() => confirmCancelSubscription(subscription.id)}
          >
            {isProcessing ? (
              <>
                <PageLoader type="spinner" size="sm" className="me-2" />
              </>
            ) : (
              "Cancel"
            )}
          </Button>
          <Button
            variant="primary"
            style={{ borderRadius: "10px" }}
            className="flex-grow-1"
            onClick={() => handleUpdatePlan(subscription.id)}
          >
            Update Plan
          </Button>
        </>
      );
    }

    return null;
  };

  const renderInactiveSubscriptionButtons = (subscription: Subscription) => {
    return (
      <Button
        variant="primary"
        className="w-100 rounded-pill"
        onClick={() => confirmReactivateSubscription(subscription.id)}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <PageLoader type="spinner" size="sm" className="me-2" />
          </>
        ) : (
          "Reactivate"
        )}
      </Button>
    );
  };

  const renderPaymentMethod = (subscription: Subscription) => {
    if (!subscription.paymentMethod) return null;

    return (
      <div className="d-flex align-items-center mt-1">
        <div
          style={{
            backgroundColor:
              subscription.paymentMethod.brand.toLowerCase() === "visa"
                ? "#1A62CB"
                : subscription.paymentMethod.brand.toLowerCase() ===
                  "mastercard"
                ? "#EB001B"
                : subscription.paymentMethod.brand.toLowerCase() === "amex"
                ? "#006FCF"
                : subscription.paymentMethod.brand.toLowerCase() === "discover"
                ? "#FF6600"
                : "#777777",
            color: "white",
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "4px",
            marginRight: "8px",
          }}
        >
          {subscription.paymentMethod.brand.toUpperCase()}
        </div>
        <span style={{ color: "#0C1F3F", fontSize: "14px" }}>
          **** {subscription.paymentMethod.last4}
        </span>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleUpdatePayment(subscription.id);
          }}
          style={{ color: "#6c757d", marginLeft: "18px" }}
        >
          <MdEdit size={24} />
        </a>
      </div>
    );
  };

  const renderSubscriptionCard = (
    subscription: Subscription,
    isActive: boolean
  ) => (
    <div
      key={subscription.id}
      style={{
        border: `1px solid ${isActive ? "#CFD2D9" : "#dee2e6"}`,
        padding: "16px",
        borderRadius: "16px",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div className="mb-3">
        <div className="d-flex align-items-center">
          <div
            className="me-3 rounded-circle"
            style={{
              width: isActive ? "60px" : "50px",
              height: isActive ? "60px" : "50px",
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: isActive ? "transparent" : "#E8E8E8",
            }}
          >
            {subscription.device?.deviceImage ? (
              <Image
                src={subscription.device.deviceImage}
                alt="Device"
                width={40}
                height={40}
                className="rounded-circle"
              />
            ) : (
              <FaCube className="text-dark" />
            )}
          </div>
          <div>
            <div
              className="fw-bold"
              style={{ color: "#0C1F3F", fontSize: "16px" }}
            >
              {subscription.device?.deviceName || "My Device"}
              {!isActive && subscription.device?.deviceName && (
                <span style={{ fontWeight: "normal", color: "#666" }}>
                  {" "}
                  (My Accord)
                </span>
              )}
            </div>
            <div
              style={{ color: isActive ? "#0C1F3F" : "#666", fontSize: "14px" }}
            >
              {formatInterval(
                subscription.interval,
                subscription.intervalCount
              )}{" "}
              Plan {getStatusBadge(subscription)}
            </div>
            <div
              className="fw-medium"
              style={{
                color: "#0C1F3F",
                fontSize: "15px",
                marginTop: "2px",
              }}
            >
              <span className="subscription-interval fw-bold">
                ${subscription.amount}
              </span>{" "}
              per{" "}
              {formatInterval(
                subscription.interval,
                subscription.intervalCount
              )}
            </div>
            <div style={{ color: "#0C1F3F", fontSize: "14px" }}>
              {subscription.isCancelled
                ? `Available until ${formatDate(subscription.currentPeriodEnd)}`
                : subscription.isFreeTrial
                ? `Start subscription on ${formatDate(
                    subscription.currentPeriodEnd
                  )}`
                : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}

              {subscription.cancelAt && !subscription.isCancelled && (
                <div>Cancels on: {formatDate(subscription.cancelAt)}</div>
              )}
              {subscription.isInGracePeriod &&
                subscription.gracePeriodMessage && (
                  <div className="alert alert-warning mt-2 mb-0 py-2 px-3">
                    <FaExclamationTriangle className="me-2" />
                    {subscription.gracePeriodMessage}
                  </div>
                )}
            </div>
            {isActive && renderPaymentMethod(subscription)}
          </div>
        </div>
      </div>

      <div className="d-flex" style={{ gap: "10px" }}>
        {isActive
          ? renderActiveSubscriptionButtons(subscription)
          : renderInactiveSubscriptionButtons(subscription)}
      </div>
    </div>
  );

  return (
    <>
      <Accordion defaultActiveKey="0" className="mb-3 border-0">
        <Accordion.Item eventKey="0" className="border-0">
          <Accordion.Header className="bg-white">
            <span
              style={{ color: "#0C1F3F", fontSize: "20px", fontWeight: "700" }}
            >
              Subscriptions
            </span>
          </Accordion.Header>
          <Accordion.Body className="p-0">
            <div className="pb-2 pt-2 px-3">
              <span
                style={{
                  color: "#0C1F3F",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                Active Subscriptions
              </span>
            </div>

            {activeSubscriptions.length > 0 ? (
              activeSubscriptions.map((subscription) => (
                <div key={subscription.id} className="p-3">
                  {renderSubscriptionCard(subscription, true)}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-muted">
                No active subscriptions found.
              </div>
            )}

            <div className="pb-2 pt-2 px-3">
              <span
                style={{
                  color: "#0C1F3F",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                Inactive Subscriptions
              </span>
            </div>

            {inactiveSubscriptions.length > 0 ? (
              inactiveSubscriptions.map((subscription) => (
                <div key={subscription.id} className="p-3">
                  {renderSubscriptionCard(subscription, false)}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-muted">
                No inactive subscriptions found.
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <UpdatePlanModal
        show={showUpdatePlanModal}
        onClose={() => setShowUpdatePlanModal(false)}
        onConfirm={confirmUpdatePlan}
        isProcessing={isProcessing}
        plans={plans} // You'll need to pass plans from parent
        currentPlanId={currentPlanId}
        selectedPlanId={selectedPlanId}
        onPlanSelect={(planId: string) => setSelectedPlanId(planId)}
      />

      <UpdatePaymentModal
        show={showUpdatePaymentModal}
        onClose={() => setShowUpdatePaymentModal(false)}
        onConfirm={confirmUpdatePayment}
        isProcessing={isProcessing}
        paymentMethods={paymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        onPaymentMethodSelect={(id: string) => setSelectedPaymentMethodId(id)}
        onAddNewPaymentMethod={onAddNewPaymentMethod}
      />
    </>
  );
}
