import React, { useState, useCallback, JSX } from "react";
import { Accordion, Badge, Button, Alert } from "react-bootstrap";
import { FaCreditCard, FaCube } from "react-icons/fa";
import { PiWarningCircleLight } from "react-icons/pi";
import Image from "next/image";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { SubscriptionService } from "./subscriptionService";
import { PageLoader } from "@/components";
import type { Customer, PaymentMethod, Plan, Subscription } from "./types";
import UpdatePlanModal from "./UpdatePlanModal";
import UpdatePaymentModal from "./UpdatePaymentModal";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import ReactivateSubscriptionModal from "./ReactivateSubscriptionModal";
import { toast } from "react-toastify";

interface SubscriptionsSectionProps {
  customer: Customer;
  subscriptions: Subscription[];
  token: string;
  plans: Plan[];
  paymentMethods: PaymentMethod[];
  onAddNewPaymentMethod: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

type ModalType = "updatePlan" | "updatePayment" | "cancel" | "reactivate";

const SubscriptionSection: React.FC<SubscriptionsSectionProps> = ({
  customer,
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
  const [reactivateStart, setReactivateStart] = useState(false);
  const [newSubStart, setNewSubStart] = useState(false);

  // Memoized processed subscriptions
  const { activeSubscriptions, inactiveSubscriptions } = React.useMemo(() => {
    const getGracePeriodMessage = (subscription: Subscription): string => {
      const formattedDate = formatDate(subscription.graceEndDate);

      return subscription.graceStatus === "active"
        ? `Your card on file was declined. To continue receiving alerts and services please update your payment method. If not updated, your subscription will end on ${formattedDate}`
        : "Your grace period has expired. Please select a plan and add a payment method to restore your service.";
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
          (sub.status === "past_due" && sub.graceStatus === "active")
      ),
      inactiveSubscriptions: processed.filter(
        (sub: any) =>
          ["canceled", "incomplete", "incomplete_expired", "unpaid"].includes(
            sub.status
          ) ||
          (sub.status === "past_due" && sub.graceStatus === "expired")
      ),
    };
  }, [subscriptions, onRefresh]);

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
    async (action: () => Promise<void>, successMessage: string) => {
      if (!currentSubscription) return;

      try {
        setIsProcessing(true);
        await action();
        await onRefresh();

        closeModal();

        toast.success(successMessage, {
          position: "top-right",
          autoClose: 5000,
        });

        if (reactivateStart) {
          openModal("updatePayment", currentSubscription);
        }
      } catch (error) {
        console.error("Subscription action failed:", error);
        toast.error("Operation failed. Please try again.", {
          position: "top-right",
          autoClose: 5000,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [currentSubscription, closeModal, reactivateStart]
  );

  const handleCancel = useCallback(
    () =>
      handleSubscriptionAction(
        () =>
          SubscriptionService.cancelSubscription(
            token,
            currentSubscription!.id
          ),
        "Subscription cancelled successfully"
      ),
    [handleSubscriptionAction, token]
  );

  const handleReactivate = useCallback(
    () =>
      handleSubscriptionAction(
        () =>
          SubscriptionService.reactivateSubscription(
            token,
            currentSubscription!.id
          ),
        "Subscription reactivated successfully"
      ),
    [handleSubscriptionAction, token]
  );

  const handlePlanUpdate = useCallback(() => {
    if (!selectedPlanId || !currentSubscription) return;

    handleSubscriptionAction(async () => {
      if (!newSubStart) {
        await SubscriptionService.updateSubscriptionPlan(
          token,
          currentSubscription.id,
          selectedPlanId
        );
      }
    }, "Subscription plan updated successfully");
  }, [
    handleSubscriptionAction,
    selectedPlanId,
    currentSubscription,
    newSubStart,
    token,
  ]);

  const handlePaymentUpdate = useCallback(async () => {
    if (!selectedPaymentMethodId || !currentSubscription || !customer) return;

    try {
      setIsProcessing(true);

      if (newSubStart) {
        await SubscriptionService.createNewSubscription(
          token,
          selectedPlanId || "",
          customer.id,
          selectedPaymentMethodId || "",
          {
            subscriptionIdDb: currentSubscription.subscriptionIdDb,
            deviceId: currentSubscription.deviceId,
            userId: customer.userId,
          }
        );
      } else {
        await SubscriptionService.updatePaymentMethod(
          token,
          currentSubscription.id,
          selectedPaymentMethodId
        );
      }

      toast.success(
        newSubStart
          ? "New subscription created successfully"
          : "Payment method updated successfully",
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
      window.location.reload();
    } catch (error: any) {
      console.error("Payment update failed:", error);
      toast.error(`Operation failed. ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  }, [
    selectedPaymentMethodId,
    currentSubscription,
    customer,
    newSubStart,
    token,
    selectedPlanId,
  ]);

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

  const formatInterval = (
    interval: string,
    count: number = 1,
    short: boolean = false
  ): string => {
    const intervals: Record<
      string,
      Record<number, { short: string; long: string }>
    > = {
      month: {
        1: { short: "Month", long: "Monthly" },
        3: { short: "Quarter", long: "Quarterly" },
        12: { short: "Year", long: "Annual" },
      },
      year: { 1: { short: "Year", long: "Annual" } },
      week: {
        1: { short: "Week", long: "Weekly" },
        2: { short: "Bi-week", long: "Bi-weekly" },
      },
      day: {
        1: { short: "Day", long: "Daily" },
        7: { short: "Week", long: "Weekly" },
        14: { short: "Bi-week", long: "Bi-weekly" },
      },
    };

    const match = intervals[interval.toLowerCase()]?.[count];

    if (match) {
      return short ? match.short : match.long;
    }

    return short
      ? `${count} ${interval.charAt(0).toUpperCase() + interval.slice(1)}`
      : `Every ${count} ${interval.toLowerCase()}${count !== 1 ? "s" : ""}`;
  };

  const getStatusMessage = (subscription: Subscription): string => {
    const periodEnd = safeFormatDate(subscription.currentPeriodEnd);
    const graceEnd = safeFormatDate(subscription.graceEndDate);

    let statusMessage = "";

    if (subscription.isCancelled) {
      statusMessage = `Valid until ${periodEnd}`;
    } else if (subscription.status === "canceled") {
      statusMessage = `Subscription canceled (${periodEnd})`;
    } else if (subscription.graceStatus === "expired") {
      statusMessage = `Grace period expired on ${graceEnd}`;
    } else if (subscription.isInGracePeriod) {
      statusMessage = `Grace period ends on ${graceEnd}`;
    } else if (subscription.isFreeTrial) {
      statusMessage = `Subscription starts on ${periodEnd}`;
    } else {
      statusMessage = `Next renewal ${periodEnd}`; // optional fallback
    }

    return statusMessage;
  };

  const safeFormatDate = (dateString?: string | null): string => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getCardIcon = (brand: string): React.ReactNode => {
    const brands: Record<string, React.ReactNode> = {
      visa: <PaymentIcon type="Visa" format="flatRounded" />,
      mastercard: <PaymentIcon type="Mastercard" format="flatRounded" />,
      amex: <PaymentIcon type="Amex" format="flatRounded" />,
      discover: <PaymentIcon type="Discover" format="flatRounded" />,
    };

    return brands[brand.toLowerCase()] || <FaCreditCard size={26} />;
  };

  const getStatusBadge = (subscription: Subscription): JSX.Element => {
    const baseStatus = (() => {
      if (
        ["active", "trialing"].includes(subscription.status) ||
        (subscription.status === "past_due" &&
          subscription.graceStatus === "active")
      ) {
        return "active";
      }

      return "inactive";
    })();

    const statusConfig: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      active: { bg: "#D6E6FF", text: "#3d4b65", label: "Active" },
      inactive: { bg: "#FEE6DA", text: "#3D4B65", label: "Inactive" },
    };

    const additionalBadges: JSX.Element[] = [];

    if (subscription.status === "trialing") {
      additionalBadges.push(
        <Badge
          key="trialing"
          style={{
            backgroundColor: "#31C48D !important",
            color: "#fff",
            fontSize: "12px",
          }}
          className="rounded-pill fontWeight-medium"
        >
          Trial ends ({formatDate(subscription.currentPeriodEnd)})
        </Badge>
      );
    }

    if (subscription.status === "past_due") {
      additionalBadges.push(
        <Badge
          key="past_due"
          style={{
            backgroundColor: "#FEE6DA !important",
            color: "#3D4B65",
            fontSize: "12px",
          }}
          className="rounded-pill fontWeight-medium"
        >
          Payment Failed
        </Badge>
      );
    }

    if (subscription.isCancelled || subscription.status === "canceled") {
      additionalBadges.push(
        <Badge
          key="canceled"
          style={{
            backgroundColor: "#FEE6DA !important",
            color: "#3D4B65 !important",
            fontSize: "12px",
          }}
          className="rounded-pill fontWeight-medium"
        >
          Cancel on{" "}
          {subscription.cancelAt
            ? ` (${formatDate(subscription.cancelAt)})`
            : ` (${formatDate(subscription.currentPeriodEnd)})`}
        </Badge>
      );
    }

    if (subscription.isInGracePeriod) {
      additionalBadges.push(
        <Badge
          key="grace"
          style={{
            backgroundColor: "#FEE6DA !important",
            color: "#3D4B65",
            fontSize: "12px",
          }}
          bg="warning"
          className="rounded-pill fontWeight-medium"
        >
          Grace Period{" "}
          {subscription.graceEndDate &&
            ` (until ${formatDate(subscription.graceEndDate)})`}
        </Badge>
      );
    }

    return (
      <>
        <Badge
          style={{
            backgroundColor: `${statusConfig[baseStatus].bg} !important`,
            color: `${statusConfig[baseStatus].text} !important`,
            fontSize: "12px",
          }}
          className="rounded-pill fontWeight-medium"
        >
          {statusConfig[baseStatus].label}
        </Badge>

        {additionalBadges}
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
            style={{
              color: "#3D4B65",
              fontSize: "12px",
            }}
          >
            **** {subscription.paymentMethod.last4}
          </span>
          <Button
            variant="link"
            onClick={() => openModal("updatePayment", subscription)}
            className="p-0 ms-2 flex align-items-start"
            style={{
              color: "#6c757d",
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
    const isActive = ["active", "trialing", "past_due"].includes(
      subscription.status
    );
    const isPastDue = subscription.status === "past_due";

    if (subscription.isCancelled || subscription.status === "canceled") {
      return (
        <>
          {subscription.status === "canceled" ? (
            <Button
              variant="primary"
              className="flex-grow-1 darkButton"
              onClick={() => {
                setNewSubStart(true);
                setReactivateStart(true);
                openModal("updatePlan", subscription);
              }}
            >
              Get Subcription
            </Button>
          ) : (
            <>
              <Button
                variant="outline-primary"
                className="flex-grow-1 lightButton"
                onClick={() => openModal("reactivate", subscription)}
                disabled={isProcessing}
              >
                {currentSubscription?.id === subscription.id && isProcessing ? (
                  <PageLoader type="spinner" size="sm" />
                ) : (
                  "Renew"
                )}
              </Button>
              <Button
                variant="primary"
                className="flex-grow-1 darkButton"
                onClick={() => openModal("updatePlan", subscription)}
              >
                Update
              </Button>
            </>
          )}
        </>
      );
    }

    if (isPastDue && subscription.graceStatus === "expired") {
      return (
        <>
          <Button
            variant="primary"
            className="flex-grow-1 darkButton"
            onClick={() => {
              setReactivateStart(true);
              openModal("updatePlan", subscription);
            }}
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
            className="flex-grow-1 lightButton"
            onClick={() => openModal("cancel", subscription)}
            disabled={isProcessing}
          >
            {currentSubscription?.id === subscription.id && isProcessing ? (
              <PageLoader type="spinner" size="sm" />
            ) : (
              "Cancel"
            )}
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
      <div className="flex items-start flex-wrap gap-3">
        <div
          className="rounded-circle w-full"
          style={{ maxWidth: "60px !important", minWidth: "60px !important" }}
        >
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
              {subscription.device?.deviceName ? (
                <span
                  className="text-uppercase fw-bold text-secondary"
                  style={{ fontSize: 14 }}
                >
                  {subscription.device.deviceName
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              ) : (
                <FaCube size={24} className="text-secondary" />
              )}
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
          <div
            className="d-flex flex-wrap align-items-center gap-2 my-1.5"
            style={{ color: "#0C1F3F", fontSize: "12px" }}
          >
            {formatInterval(subscription.interval, subscription.interval_count)}{" "}
            Plan
            <div className="d-flex flex-wrap align-items-center gap-2">
              {getStatusBadge(subscription)}
            </div>
          </div>

          <div
            className="gap-1 flex align-items-center my-1"
            style={{
              color: "#0C1F3F",
              fontSize: "14px",
            }}
          >
            <span className="fw-bold subscription-interval">
              ${subscription.amount}
            </span>
            <span style={{ color: "#3D4B65", fontSize: "14px" }}>
              per{" "}
              {formatInterval(
                subscription.interval,
                subscription.interval_count,
                true
              )}
            </span>
          </div>

          <div style={{ color: "#3D4B65", fontSize: "12px" }}>
            {getStatusMessage(subscription)}

            {/* Cancellation date if applicable */}
            {subscription.cancelAt && !subscription.isCancelled && (
              <div>Cancels on: {safeFormatDate(subscription.cancelAt)}</div>
            )}

            {/* Grace period warning */}
            {subscription.isInGracePeriod &&
              subscription.gracePeriodMessage && (
                <Alert
                  variant="light"
                  className="mt-2 p-2 d-flex align-items-center border-1"
                  style={{ color: "#3D4B65", fontSize: "12px" }}
                >
                  <PiWarningCircleLight
                    className="me-2"
                    size={18}
                    color="#FF824C"
                    style={{ minWidth: "18px" }}
                  />
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
  );

  return (
    <>
      <Accordion defaultActiveKey="0" className="mb-3 border-0">
        <Accordion.Item eventKey="0" className="border-0">
          <Accordion.Header className="bg-white">
            <span
              style={{ color: "#0C1F3F", fontSize: "18px", fontWeight: "700" }}
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
                    fontSize: "16px",
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
                  <div key={sub.id} className="p-3 mb-4">
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
        reactivateStart={reactivateStart}
        onPlanSelect={setSelectedPlanId}
      />

      <UpdatePaymentModal
        show={activeModal === "updatePayment"}
        onClose={closeModal}
        onConfirm={handlePaymentUpdate}
        isProcessing={isProcessing}
        paymentMethods={paymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        newSubStart={newSubStart}
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
    </>
  );
};

export default SubscriptionSection;
