import React, { useState, useCallback, useMemo, JSX, useEffect } from "react";
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

type ModalType = "updatePlan" | "updatePayment" | "cancel" | "reactivate";

interface SubscriptionsSectionProps {
  customer: Customer;
  subscriptions: Subscription[];
  token: string;
  plans: Plan[];
  paymentMethods: PaymentMethod[];
  onAddNewPaymentMethod: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface ProcessedSubscription extends Subscription {
  gracePeriodMessage?: string;
}

// Define response type for subscription actions
interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

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

  // Reset state when modals close
  useEffect(() => {
    if (activeModal === null) {
      setReactivateStart(false);
      setNewSubStart(false);
    }
  }, [activeModal]);

  // Helper functions
  const formatDate = useCallback((dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC", // Force UTC
      });
    } catch {
      return "N/A";
    }
  }, []);

  const formatInterval = useCallback(
    (interval: string, count: number = 1, short: boolean = false): string => {
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

      const match = intervals[interval?.toLowerCase()]?.[count];
      return match
        ? short
          ? match.short
          : match.long
        : short
        ? `${count} ${
            interval?.charAt(0).toUpperCase() + interval?.slice(1) || ""
          }`
        : `Every ${count} ${interval?.toLowerCase() || ""}${
            count !== 1 ? "s" : ""
          }`;
    },
    []
  );

  const getCardIcon = useCallback((brand: string): React.ReactNode => {
    const brands: Record<string, React.ReactNode> = {
      visa: <PaymentIcon type="Visa" format="flatRounded" />,
      mastercard: <PaymentIcon type="Mastercard" format="flatRounded" />,
      amex: <PaymentIcon type="Amex" format="flatRounded" />,
      discover: <PaymentIcon type="Discover" format="flatRounded" />,
    };
    return brands[brand?.toLowerCase()] || <FaCreditCard size={26} />;
  }, []);

  // Process subscriptions
  const { activeSubscriptions, inactiveSubscriptions } = useMemo(() => {
    const processSubscription = (sub: Subscription): ProcessedSubscription => {
      let gracePeriodMessage = "";

      if (sub.isInGracePeriod) {
        const formattedDate = formatDate(sub.graceEndDate);
        gracePeriodMessage =
          sub.graceStatus === "active"
            ? `Your card on file was declined. To continue receiving alerts and services please update your payment method. If not updated, your subscription will end on ${formattedDate}`
            : "Your grace period has expired. Please select a plan and add a payment method to restore your service.";
      }

      return { ...sub, gracePeriodMessage };
    };

    const processed = subscriptions.map(processSubscription);

    return {
      activeSubscriptions: processed.filter(
        (sub) =>
          ["active", "trialing"].includes(sub.status) ||
          (sub.status === "past_due" && sub.graceStatus === "active")
      ),
      inactiveSubscriptions: processed.filter(
        (sub) =>
          ["canceled", "incomplete", "incomplete_expired", "unpaid"].includes(
            sub.status
          ) ||
          (sub.status === "past_due" && sub.graceStatus === "expired")
      ),
    };
  }, [subscriptions, formatDate]);

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
    setSelectedPlanId(null);
    setSelectedPaymentMethodId(null);
  }, []);

  // Extract error message helper
  const getErrorMessage = useCallback((error: any): string => {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Operation failed"
    );
  }, []);

  // Action handlers
  const handleSubscriptionAction = useCallback(
    async (
      action: () => Promise<ApiResponse | undefined>,
      successMessage: string
    ) => {
      if (!currentSubscription) return;

      try {
        setIsProcessing(true);
        const response = await action();

        // If we got this far, the action was successful
        await onRefresh();
        toast.success(successMessage, {
          position: "top-right",
          autoClose: 5000,
        });

        if (reactivateStart) {
          openModal("updatePayment", currentSubscription);
        } else {
          closeModal();
        }
      } catch (error: any) {
        console.error("Subscription action failed:", error);
        toast.error(`Action failed: ${getErrorMessage(error)}`, {
          position: "top-right",
          autoClose: 5000,
        });
        closeModal();
      } finally {
        setIsProcessing(false);
      }
    },
    [
      currentSubscription,
      closeModal,
      reactivateStart,
      openModal,
      onRefresh,
      getErrorMessage,
    ]
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
    [currentSubscription, handleSubscriptionAction, token]
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
    [currentSubscription, handleSubscriptionAction, token]
  );

  const handlePlanUpdate = useCallback(() => {
    if (!selectedPlanId || !currentSubscription) return;

    setIsProcessing(true);

    if (newSubStart) {
      // If it's a new subscription, we'll handle it in the payment update step
      if (reactivateStart) {
        openModal("updatePayment", currentSubscription);
      }
      setIsProcessing(false);
      return;
    }

    SubscriptionService.updateSubscriptionPlan(
      token,
      currentSubscription.id,
      selectedPlanId
    )
      .then(async (response) => {
        // Update successful
        await onRefresh();
        toast.success("Subscription plan updated successfully", {
          position: "top-right",
          autoClose: 5000,
        });

        if (reactivateStart) {
          openModal("updatePayment", currentSubscription);
        } else {
          closeModal();
        }
      })
      .catch((error) => {
        console.error("Plan update failed:", error);
        toast.error(`Plan update failed: ${getErrorMessage(error)}`, {
          position: "top-right",
          autoClose: 5000,
        });
        closeModal();
      })
      .finally(() => {
        setIsProcessing(false);
      });
  }, [
    selectedPlanId,
    currentSubscription,
    token,
    onRefresh,
    closeModal,
    reactivateStart,
    openModal,
    newSubStart,
    getErrorMessage,
  ]);

  const handlePaymentUpdate = useCallback(async () => {
    if (!selectedPaymentMethodId || !currentSubscription) return;

    setIsProcessing(true);

    try {
      // If we're coming from reactivation flow or new subscription flow
      if (reactivateStart || newSubStart) {
        // First handle the payment update
        await SubscriptionService.updatePaymentMethod(
          token,
          currentSubscription.id,
          selectedPaymentMethodId
        );

        // Now handle reactivation without refreshing the page to maintain state
        if (reactivateStart && !currentSubscription.isCancelled) {
          await SubscriptionService.reactivateSubscription(
            token,
            currentSubscription.id
          );
        }

        // Handle plan update if needed
        if (selectedPlanId && selectedPlanId !== currentSubscription.planId) {
          await SubscriptionService.updateSubscriptionPlan(
            token,
            currentSubscription.id,
            selectedPlanId
          );
        }

        // Only refresh data once after all operations
        await onRefresh();

        toast.success("Subscription updated successfully", {
          position: "top-right",
          autoClose: 5000,
        });

        closeModal();
        return;
      }

      // Regular payment method update flow
      await SubscriptionService.updatePaymentMethod(
        token,
        currentSubscription.id,
        selectedPaymentMethodId
      );

      await onRefresh();
      toast.success("Payment method updated successfully", {
        position: "top-right",
        autoClose: 5000,
      });

      closeModal();
    } catch (error) {
      console.error("Payment update failed:", error);
      toast.error(`Payment update failed: ${getErrorMessage(error)}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedPaymentMethodId,
    currentSubscription,
    customer,
    newSubStart,
    token,
    selectedPlanId,
    getErrorMessage,
    closeModal,
    reactivateStart,
    onRefresh,
  ]);

  // Component rendering helpers
  const getStatusMessage = useCallback(
    (subscription: Subscription): string => {
      const periodEnd = formatDate(subscription.currentPeriodEnd);
      const graceEnd = formatDate(subscription.graceEndDate);

      if (subscription.isCancelled) {
        return `Valid until ${periodEnd}`;
      }
      if (subscription.status === "canceled") {
        return `Subscription canceled (${periodEnd})`;
      }
      if (subscription.graceStatus === "expired") {
        return `Grace period expired on ${graceEnd}`;
      }
      if (subscription.isInGracePeriod) {
        return `Grace period ends on ${graceEnd}`;
      }
      if (subscription.isFreeTrial) {
        return `Subscription starts on ${periodEnd}`;
      }
      return `Next renewal ${periodEnd}`;
    },
    [formatDate]
  );

  const renderStatusBadges = useCallback(
    (subscription: Subscription, isActive: boolean) => {
      const badges: JSX.Element[] = [];

      if (isActive) {
        if (subscription.status === "trialing") {
          badges.push(
            <Badge
              key="trialing"
              className="rounded-pill fontWeight-medium badge-trialing"
            >
              Trial ends {formatDate(subscription.currentPeriodEnd)}
            </Badge>
          );
        }

        if (
          subscription.pauseBehavior ||
          subscription.isCancelled ||
          subscription.isInGracePeriod
        ) {
          badges.push(
            <Badge
              key="action-needed"
              className="rounded-pill fontWeight-medium badge-active"
            >
              Action needed
            </Badge>
          );
        }

        if (subscription.pauseBehavior) {
          badges.push(
            <Badge
              key="paused"
              className="rounded-pill fontWeight-medium badge-paused"
              title="Payment collection paused indefinitely. All invoices generated by this subscription will remain as drafts and won't advance automatically."
            >
              Collection paused
            </Badge>
          );
        }

        if (subscription.isCancelled) {
          badges.push(
            <Badge
              key="canceled"
              className="rounded-pill fontWeight-medium badge-canceled"
            >
              Cancel on{" "}
              {formatDate(
                subscription.cancelAt || subscription.currentPeriodEnd
              )}
            </Badge>
          );
        }

        if (subscription.isInGracePeriod) {
          badges.push(
            <Badge
              key="grace"
              className="rounded-pill fontWeight-medium badge-grace"
            >
              Grace Period{" "}
              {subscription.graceEndDate &&
                `ends ${formatDate(subscription.graceEndDate)}`}
            </Badge>
          );
        }
      } else {
        badges.push(
          <Badge
            key="action-needed"
            className="rounded-pill fontWeight-medium badge-active"
          >
            Action needed
          </Badge>
        );
        if (["canceled", "incomplete"].includes(subscription.status)) {
          badges.push(
            <Badge
              key="canceled"
              className="rounded-pill fontWeight-medium badge-canceled"
            >
              Canceled
            </Badge>
          );
        }

        if (subscription.graceStatus === "expired") {
          badges.push(
            <Badge
              key="grace"
              className="rounded-pill fontWeight-medium badge-grace"
            >
              Grace Expired{" "}
              {subscription.graceEndDate &&
                `${formatDate(subscription.graceEndDate)}`}
            </Badge>
          );
        }
      }

      return <>{badges}</>;
    },
    [formatDate]
  );

  const renderAlertMessage = useCallback(
    (subscription: ProcessedSubscription) => {
      if (
        (subscription.status === "past_due" || subscription.isInGracePeriod) &&
        subscription.gracePeriodMessage
      ) {
        return (
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
        );
      }
      return null;
    },
    []
  );

  const renderPaymentMethod = useCallback(
    (subscription: Subscription) => {
      if (!subscription.paymentMethod) return null;

      return (
        <div className="payment-info d-flex items-center mt-2">
          <div className="card-icon mr-3">
            {getCardIcon(subscription.paymentMethod.brand)}
          </div>
          <div className="d-flex align-items-center">
            <span style={{ color: "#3D4B65", fontSize: "12px" }}>
              **** {subscription.paymentMethod.last4}
            </span>
            <Button
              variant="link"
              onClick={() => openModal("updatePayment", subscription)}
              className="p-0 ms-2 flex align-items-start"
              style={{ color: "#6c757d" }}
              disabled={isProcessing}
            >
              <Image src="/pencil.svg" alt="Edit" width={20} height={20} />
            </Button>
          </div>
        </div>
      );
    },
    [getCardIcon, openModal, isProcessing]
  );

  const renderSubscriptionActions = useCallback(
    (subscription: Subscription, isActive: boolean) => {
      const isCurrentSub = currentSubscription?.id === subscription.id;
      const loading = isCurrentSub && isProcessing;

      if (isActive) {
        if (subscription.isCancelled) {
          return (
            <>
              <Button
                variant="outline-primary"
                className="flex-grow-1 lightButton"
                onClick={() => openModal("reactivate", subscription)}
                disabled={loading}
              >
                {loading ? <PageLoader type="spinner" size="sm" /> : "Renew"}
              </Button>
              <Button
                variant="primary"
                className="flex-grow-1 darkButton"
                onClick={() => openModal("updatePlan", subscription)}
                disabled={loading}
              >
                Update
              </Button>
            </>
          );
        }

        return (
          <>
            <Button
              variant="outline-primary"
              className="flex-grow-1 lightButton"
              onClick={() => openModal("cancel", subscription)}
              disabled={loading}
            >
              {loading ? <PageLoader type="spinner" size="sm" /> : "Cancel"}
            </Button>
            <Button
              variant="primary"
              className="flex-grow-1 darkButton"
              onClick={() => openModal("updatePlan", subscription)}
              disabled={loading}
            >
              Update
            </Button>
          </>
        );
      }

      if (!isActive) {
        if (["canceled", "incomplete"].includes(subscription.status)) {
          return (
            <Button
              variant="primary"
              className="flex-grow-1 darkButton"
              onClick={() => {
                setNewSubStart(true);
                setReactivateStart(true);
                openModal("updatePlan", subscription);
              }}
              disabled={loading}
            >
              {loading ? (
                <PageLoader type="spinner" size="sm" />
              ) : subscription.status === "canceled" ? (
                "Re-purchase subscription"
              ) : (
                "Complete subscription"
              )}
            </Button>
          );
        }

        if (subscription.graceStatus === "expired") {
          return (
            <Button
              variant="primary"
              className="flex-grow-1 darkButton"
              onClick={() => {
                setReactivateStart(true);
                openModal("updatePlan", subscription);
              }}
              disabled={loading}
            >
              {loading ? <PageLoader type="spinner" size="sm" /> : "Reactivate"}
            </Button>
          );
        }
      }

      return null;
    },
    [isProcessing, currentSubscription, openModal]
  );

  const renderSubscriptionCard = useCallback(
    (subscription: ProcessedSubscription, isActive: boolean) => (
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
            style={{ maxWidth: "60px", minWidth: "60px" }}
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
              {formatInterval(
                subscription.interval,
                subscription.interval_count
              )}{" "}
              Plan
              <div className="d-flex flex-wrap align-items-center gap-2">
                {renderStatusBadges(subscription, isActive)}
              </div>
            </div>

            <div
              className="gap-1 flex align-items-center my-1"
              style={{ color: "#0C1F3F", fontSize: "14px" }}
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
              {renderAlertMessage(subscription)}
            </div>

            {isActive && renderPaymentMethod(subscription)}
          </div>
        </div>
        <div className="d-flex mt-3 gap-2">
          {renderSubscriptionActions(subscription, isActive)}
        </div>
      </div>
    ),
    [
      formatInterval,
      renderStatusBadges,
      getStatusMessage,
      renderAlertMessage,
      renderPaymentMethod,
      renderSubscriptionActions,
    ]
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
                  <div key={sub.id} data-id={sub.id} className="p-3">
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
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  Inactive Subscriptions
                </span>
              </div>
              {inactiveSubscriptions.length > 0 ? (
                inactiveSubscriptions.map((sub) => (
                  <div key={sub.id} data-id={sub.id} className="p-3 mb-4">
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
