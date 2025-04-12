import React, { useState, useCallback, JSX } from "react";
import { Accordion, Badge, Button, Alert } from "react-bootstrap";
import { FaCreditCard, FaCube, FaExclamationTriangle } from "react-icons/fa";
import Image from "next/image";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { SubscriptionService } from "./subscriptionService";
import { PageLoader } from "@/components";
import type { PaymentMethod, Plan, Subscription } from "./types";
import UpdatePlanModal from "./UpdatePlanModal";
import UpdatePaymentModal from "./UpdatePaymentModal";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import ReactivateSubscriptionModal from "./ReactivateSubscriptionModal";

interface SubscriptionsSectionProps {
  subscriptions: Subscription[];
  token: string;
  plans: Plan[];
  paymentMethods: PaymentMethod[];
  onAddNewPaymentMethod: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

type ModalType = "updatePlan" | "updatePayment" | "cancel" | "reactivate";

const SubscriptionSection: React.FC<SubscriptionsSectionProps> = ({
  subscriptions,
  token,
  plans,
  paymentMethods,
  onAddNewPaymentMethod,
  onRefresh,
}) => {
  // State management
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Memoized processed subscriptions
  const { activeSubscriptions, inactiveSubscriptions } = React.useMemo(() => {
    const getGracePeriodMessage = (subscription: Subscription): string => {
      const remainingDays = subscription.gracePeriodRemainingDays || 0;
      const formattedDate = formatDate(subscription.graceEndDate);

      return remainingDays <= 0
        ? "Your grace period has expired. Please update your payment method to restore service."
        : `Your card on file was declined. To continue service, please update your payment method before ${formattedDate}`;
    };

    const formatDate = (dateString?: string): string => {
      if (!dateString) return "N/A";
      try {
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return "N/A";
      }
    };

    const now = Date.now();

    const processed =
      subscriptions &&
      subscriptions.map((sub) => ({
        ...sub,
        gracePeriodMessage: sub.isInGracePeriod
          ? getGracePeriodMessage(sub)
          : undefined,
      }));

    return {
      activeSubscriptions: processed.filter(
        (sub: any) =>
          ["active", "trialing"].includes(sub.status) ||
          (sub.status === "past_due" &&
            new Date(sub.graceEndDate).getTime() > now)
      ),
      inactiveSubscriptions: processed.filter(
        (sub: any) =>
          ["canceled", "incomplete", "incomplete_expired", "unpaid"].includes(
            sub.status
          ) ||
          (sub.status === "past_due" &&
            new Date(sub.graceEndDate).getTime() <= now)
      ),
    };
  }, [subscriptions]);

  // Modal handlers
  const openModal = useCallback(
    (type: ModalType, subscription: Subscription) => {
      setCurrentSubscription(subscription);
      setActiveModal(type);

      if (type === "updatePlan") {
        setSelectedPlanId(subscription.planId);
      } else if (type === "updatePayment") {
        setSelectedPaymentMethodId(subscription.paymentMethod?.id || null);
      }
    },
    []
  );

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setCurrentSubscription(null);
  }, []);

  // Action handlers
  const handleSubscriptionAction = useCallback(
    async (action: () => Promise<void>) => {
      if (!currentSubscription) return;

      try {
        setIsProcessing(true);
        await action();
        await onRefresh();
        closeModal();
      } catch (error) {
        console.error("Subscription action failed:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentSubscription, onRefresh, closeModal]
  );

  const handleCancel = useCallback(
    () =>
      handleSubscriptionAction(() =>
        SubscriptionService.cancelSubscription(token, currentSubscription!.id)
      ),
    [handleSubscriptionAction, token]
  );

  const handleReactivate = useCallback(
    () =>
      handleSubscriptionAction(() =>
        SubscriptionService.reactivateSubscription(
          token,
          currentSubscription!.id
        )
      ),
    [handleSubscriptionAction, token]
  );

  const handlePlanUpdate = useCallback(() => {
    if (!selectedPlanId) return;
    handleSubscriptionAction(() =>
      SubscriptionService.updateSubscriptionPlan(
        token,
        currentSubscription!.id,
        selectedPlanId
      )
    );
  }, [handleSubscriptionAction, selectedPlanId, token]);

  const handlePaymentUpdate = useCallback(() => {
    if (!selectedPaymentMethodId) return;
    handleSubscriptionAction(async () => {
      await SubscriptionService.updatePaymentMethod(
        token,
        currentSubscription!.id,
        selectedPaymentMethodId
      );
      // Wait for Stripe webhook to process
      await new Promise((resolve) => setTimeout(resolve, 10000));
    });
  }, [handleSubscriptionAction, selectedPaymentMethodId, token]);

  // Helper functions
  const getGracePeriodMessage = (subscription: Subscription): string => {
    const remainingDays = subscription.gracePeriodRemainingDays || 0;
    const formattedDate = formatDate(subscription.graceEndDate);

    return remainingDays <= 0
      ? "Your grace period has expired. Please update your payment method to restore service."
      : `Your card on file was declined. To continue service, please update your payment method before ${formattedDate}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatInterval = (interval: string, count: number = 1): string => {
    const intervals: Record<string, Record<number, string>> = {
      month: { 1: "Month", 3: "Quarterly", 12: "Annual" },
      year: { 1: "Annual" },
      week: { 1: "Weekly", 2: "Bi-weekly" },
      day: { 1: "Daily", 7: "Weekly", 14: "Bi-weekly" },
    };

    return (
      intervals[interval.toLowerCase()]?.[count] ||
      `Every ${count} ${interval.toLowerCase()}${count !== 1 ? "s" : ""}`
    );
  };

  const getStatusMessage = (subscription: Subscription): string => {
    if (subscription.isCancelled) {
      return `Available until ${safeFormatDate(subscription.currentPeriodEnd)}`;
    }
    if (subscription.isFreeTrial) {
      return `Subscription starts on ${safeFormatDate(
        subscription.currentPeriodEnd
      )}`;
    }
    if (subscription.isInGracePeriod) {
      return `Grace Period ends on ${safeFormatDate(
        subscription.graceEndDate
      )}`;
    }
    return `Renews on ${safeFormatDate(subscription.currentPeriodEnd)}`;
  };

  const safeFormatDate = (dateString?: string | null): string => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getCardIcon = (brand: string): React.ReactNode => {
    const brands: Record<string, React.ReactNode> = {
      visa: <PaymentIcon type="Visa" format="flatRounded" width={38} />,
      mastercard: (
        <PaymentIcon type="Mastercard" format="flatRounded" width={38} />
      ),
      amex: <PaymentIcon type="Amex" format="flatRounded" width={28} />,
      discover: <PaymentIcon type="Discover" format="flatRounded" width={28} />,
    };

    return brands[brand.toLowerCase()] || <FaCreditCard size={26} />;
  };

  const getStatusBadge = (subscription: Subscription): JSX.Element => {
    const statusConfig: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      trialing: { bg: "rgb(214, 230, 255)", text: "#3D4B65", label: "Active" },
      active: { bg: "rgb(214, 230, 255)", text: "#3D4B65", label: "Active" },
      past_due: { bg: "#FEE6DA", text: "#3D4B65", label: "Payment Failed" },
      canceled: { bg: "#FEE6DA", text: "#3D4B65", label: "Canceled" },
    };

    const config = statusConfig[subscription.status] || {
      bg: "#FEE6DA",
      text: "#3D4B65",
      label:
        subscription.status.charAt(0).toUpperCase() +
        subscription.status.slice(1),
    };

    return (
      <>
        <Badge
          style={{
            backgroundColor: `${config.bg} !important`,
            color: `${config.text} !important`,
          }}
          className="rounded-pill m-2"
        >
          {config.label}
        </Badge>
        {subscription.status === "trialing" && (
          <Badge bg="success" className="ms-2 rounded-pill">
            Free Trial (ends {formatDate(subscription.currentPeriodEnd)})
          </Badge>
        )}
        {subscription.isInGracePeriod && (
          <Badge bg="warning" className="ms-2 rounded-pill">
            Grace Period{" "}
            {subscription.graceEndDate &&
              ` (until ${formatDate(subscription.graceEndDate)})`}
          </Badge>
        )}
      </>
    );
  };

  const renderPaymentMethod = (
    subscription: Subscription
  ): JSX.Element | null => {
    if (!subscription.paymentMethod) return null;

    return (
      <div className="payment-info d-flex items-center mt-2">
        <div className="card-icon mr-3">
          {getCardIcon(subscription.paymentMethod.brand)}
        </div>
        <div className="d-flex align-items-center">
          <span
            className="text-dark"
            style={{
              color: "#0C1F3F",
              fontSize: "16px",
            }}
          >
            **** {subscription.paymentMethod.last4}
          </span>
          <Button
            variant="link"
            onClick={() => openModal("updatePayment", subscription)}
            className="p-0"
            style={{
              color: "#6c757d",
              marginLeft: "5px",
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <Image src="/pencil.svg" alt="Edit" width={20} height={20} />
          </Button>
        </div>
      </div>
    );
  };

  const renderSubscriptionActions = (
    subscription: Subscription
  ): JSX.Element | null => {
    const isActive = ["active", "trialing"].includes(subscription.status);
    const isPastDue = subscription.status === "past_due";
    const isCanceled = subscription.status === "canceled";

    if (isCanceled) {
      return (
        <>
          <Button
            variant="outline-primary"
            className="flex-grow-1 me-2 lightButton"
            onClick={() => openModal("reactivate", subscription)}
            disabled={isProcessing}
          >
            {isProcessing ? <PageLoader type="spinner" size="sm" /> : "Renew"}
          </Button>
          <Button
            variant="primary"
            className="flex-grow-1 darkButton"
            onClick={() => openModal("updatePlan", subscription)}
          >
            Update
          </Button>
        </>
      );
    }

    if (isPastDue || subscription.isInGracePeriod) {
      return (
        <>
          <Button
            variant="outline-primary"
            className="flex-grow-1 me-2 lightButton"
            onClick={() => openModal("updatePlan", subscription)}
          >
            Update
          </Button>
          <Button
            variant="primary"
            className="flex-grow-1 darkButton"
            onClick={() => openModal("updatePayment", subscription)}
          >
            Reactivate
          </Button>
        </>
      );
    }

    if (isActive) {
      return (
        <>
          <Button
            variant="outline-primary"
            className="flex-grow-1 me-2 lightButton"
            onClick={() => openModal("cancel", subscription)}
            disabled={isProcessing}
          >
            {isProcessing ? <PageLoader type="spinner" size="sm" /> : "Cancel"}
          </Button>
          <Button
            variant="primary"
            className="flex-grow-1 darkButton"
            onClick={() => openModal("updatePlan", subscription)}
          >
            Update
          </Button>
        </>
      );
    }

    return null;
  };

  const renderSubscriptionCard = (
    subscription: Subscription,
    isActive: boolean
  ) => (
    <div
      style={{
        border: "1px solid #CFD2D9",
        padding: "16px",
        borderRadius: "16px",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div className="me-3">
        <div className="d-flex align-items-start">
          <div className="me-3 rounded-circle">
            {subscription.device?.deviceImage ? (
              <Image
                src={subscription.device.deviceImage}
                alt="Device"
                width={60}
                height={60}
                className="rounded-circle"
              />
            ) : (
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-light"
                style={{ width: 60, height: 60 }}
              >
                <FaCube size={24} className="text-secondary" />
              </div>
            )}
          </div>

          <div className="flex-grow-1">
            <h6
              className="fw-bold mb-0"
              style={{ color: "#0C1F3F", fontSize: "16px" }}
            >
              {subscription.device?.deviceName || "My Device"}
            </h6>
            <div style={{ color: "#0C1F3F", fontSize: "14px" }}>
              {formatInterval(
                subscription.interval,
                subscription.interval_count
              )}{" "}
              Plan
              <div className="d-inline-flex align-items-center">
                {getStatusBadge(subscription)}
              </div>
            </div>

            <div
              className="fw-medium"
              style={{
                color: "#0C1F3F",
                fontSize: "15px",
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span className="fw-bold subscription-interval">
                ${subscription.amount}
              </span>
              <span style={{ color: "#3D4B65", fontSize: "14px" }}>
                per{" "}
                {formatInterval(
                  subscription.interval,
                  subscription.interval_count
                )}
              </span>
            </div>

            <div style={{ color: "#0C1F3F", fontSize: "14px" }}>
              {getStatusMessage(subscription)}

              {/* Cancellation date if applicable */}
              {subscription.cancelAt && !subscription.isCancelled && (
                <div>Cancels on: {safeFormatDate(subscription.cancelAt)}</div>
              )}

              {/* Grace period warning */}
              {subscription.isInGracePeriod &&
                subscription.gracePeriodMessage && (
                  <Alert
                    variant="warning"
                    className="mt-2 mb-0 py-2 px-3 d-flex align-items-center"
                  >
                    <FaExclamationTriangle className="me-2" />
                    {subscription.gracePeriodMessage}
                  </Alert>
                )}
            </div>

            {isActive && renderPaymentMethod(subscription)}
          </div>
        </div>
        <div className="d-flex mt-3 gap-2">
          {renderSubscriptionActions(subscription)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid p-0">
      <Accordion defaultActiveKey="0" className="mb-4">
        <Accordion.Item eventKey="0" className="border-0">
          <Accordion.Header className="bg-white">
            <span
              style={{ color: "#0C1F3F", fontSize: "20px", fontWeight: "700" }}
            >
              Subscriptions
            </span>
          </Accordion.Header>
          <Accordion.Body className="p-0">
            <div className="mb-4">
              <div className="pb-2 pt-2 px-3 mb-0">
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
                activeSubscriptions.map((sub) => (
                  <div key={sub.id} className="p-3">
                    {renderSubscriptionCard(sub, true)}
                  </div>
                ))
              ) : (
                <p className="px-3 text-muted text-center">
                  No active subscriptions
                </p>
              )}
            </div>

            <div className="mb-4">
              <div className="pb-2 pt-2 px-3 mb-0">
                <span
                  style={{
                    color: "#0C1F3F",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  Inactive Subscriptions{" "}
                </span>
              </div>
              {inactiveSubscriptions.length > 0 ? (
                inactiveSubscriptions.map((sub) => (
                  <div key={sub.id} className="p-3">
                    {renderSubscriptionCard(sub, false)}
                  </div>
                ))
              ) : (
                <p className="px-3 text-muted text-center">
                  No inactive subscriptions
                </p>
              )}
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {/* Modals */}
      <UpdatePlanModal
        show={activeModal === "updatePlan"}
        onClose={closeModal}
        onConfirm={handlePlanUpdate}
        isProcessing={isProcessing}
        plans={plans}
        currentPlanId={currentSubscription?.planId || ""}
        selectedPlanId={selectedPlanId}
        onPlanSelect={setSelectedPlanId}
      />

      <UpdatePaymentModal
        show={activeModal === "updatePayment"}
        onClose={closeModal}
        onConfirm={handlePaymentUpdate}
        isProcessing={isProcessing}
        paymentMethods={paymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        onPaymentMethodSelect={setSelectedPaymentMethodId}
        onAddNewPaymentMethod={onAddNewPaymentMethod}
      />

      <CancelSubscriptionModal
        show={activeModal === "cancel"}
        onClose={closeModal}
        onConfirm={handleCancel}
        isProcessing={isProcessing}
      />

      <ReactivateSubscriptionModal
        show={activeModal === "reactivate"}
        onClose={closeModal}
        onConfirm={handleReactivate}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default SubscriptionSection;
