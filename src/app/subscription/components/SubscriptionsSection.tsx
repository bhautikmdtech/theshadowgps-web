import React, { useState } from "react";
import { Accordion, Badge, Button } from "react-bootstrap";
import { FaCreditCard, FaCube, FaExclamationTriangle } from "react-icons/fa";
import Image from "next/image";
import { SubscriptionService } from "./subscriptionService";
import UpdatePaymentModal from "./UpdatePaymentModal";
import UpdatePlanModal from "./UpdatePlanModal";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import ReactivateSubscriptionModal from "./ReactivateSubscriptionModal";
import { PaymentMethod, Plan, Subscription } from "./types";
import { PageLoader } from "@/components";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<
    string | null
  >(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSubscriptionId, setProcessingSubscriptionId] = useState<
    string | null
  >(null);

  const getCardIcon = (brand: string): React.ReactNode => {
    const brands: Record<string, React.ReactNode> = {
      visa: <PaymentIcon type="Visa" format="flatRounded" width={40} />,
      mastercard: (
        <PaymentIcon type="Mastercard" format="flatRounded" width={40} />
      ),
      amex: <PaymentIcon type="Amex" format="flatRounded" width={30} />,
      discover: <PaymentIcon type="Discover" format="flatRounded" width={30} />,
      diners: <PaymentIcon type="Diners" format="flatRounded" width={30} />,
      jcb: <PaymentIcon type="Jcb" format="flatRounded" width={30} />,
    };

    return brands[brand.toLowerCase()] || <FaCreditCard />;
  };

  const confirmCancelSubscription = async (subscriptionId: string) => {
    if (!subscriptionId) return;
    setCurrentSubscriptionId(subscriptionId);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!currentSubscriptionId) return;

    try {
      setProcessingSubscriptionId(currentSubscriptionId);
      await SubscriptionService.cancelSubscription(token, currentSubscriptionId);
      await onRefresh();
      setShowCancelModal(false);
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    } finally {
      setProcessingSubscriptionId(null);
    }
  };

  const confirmReactivateSubscription = async (subscriptionId: string) => {
    if (!subscriptionId) return;
    setCurrentSubscriptionId(subscriptionId);
    setShowReactivateModal(true);
  };

  const handleConfirmReactivate = async () => {
    if (!currentSubscriptionId) return;

    try {
      setProcessingSubscriptionId(currentSubscriptionId);
      await SubscriptionService.reactivateSubscription(token, currentSubscriptionId);
      await onRefresh();
      setShowReactivateModal(false);
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
    } finally {
      setProcessingSubscriptionId(null);
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
      // ⏳ Wait 10 seconds before refreshing
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await onRefresh();
      setShowUpdatePaymentModal(false);
    } catch (error) {
      console.error("Failed to update payment method:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processedSubscriptions = subscriptions.map(
    (subscription: Subscription) => {
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

        let gracePeriodMessage = "";
        if (remainingDays <= 0) {
          gracePeriodMessage = `Your grace period has expired. Please update your payment method to restore service.`;
        } else {
          gracePeriodMessage = `Your card on file was declined. To continue receiving alerts and services, please update your payment method. If not updated, your subscription will end on ${formattedGraceEndDate}`;
        }

        transformedSubscription.isInGracePeriod = true;
        transformedSubscription.graceEndDate = formattedGraceEndDate;
        transformedSubscription.gracePeriodMessage = gracePeriodMessage;
        transformedSubscription.gracePeriodRemainingDays = remainingDays;
      }

      return transformedSubscription;
    }
  );

  const activeSubscriptions = processedSubscriptions.filter(
    (sub) => sub.status === "active" || sub.status === "trialing"
  );

  const inactiveSubscriptions = processedSubscriptions.filter(
    (sub) =>
      sub.status === "canceled" ||
      sub.status === "incomplete" ||
      sub.status === "incomplete_expired" ||
      sub.status === "paused" ||
      sub.status === "unpaid" ||
      sub.status === "past_due"
  );

  const getStatusBadge = (subscription: Subscription) => {
    if (subscription.status === "trialing") {
      return (
        <>
         <Badge
         className="active-badge-rounded-pill"
         style={{ backgroundColor: "rgb(214, 230, 255) !important" ,color: "#3D4B65"}} 
       >
        Active
       </Badge>{" "}
       <Badge style={{backgroundColor: "#31C48D !important", color: "#ffffff"}} className="free-trial-badge-rounded-pill">
            Free Trial (ends {formatDate(subscription.currentPeriodEnd)})
          </Badge>
        </>
      );
    }

    if (subscription.isInGracePeriod) {
      return (
        <>
         <Badge style={{backgroundColor: "#FEE6DA !important", color: "#3D4B65"}} className="cancle-badge-rounded-pill">
            Payment Failed
          </Badge>
          <Badge style={{backgroundColor: "#FEE6DA !important", color: "#3D4B65"}} className="cancle-badge-rounded-pill">
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
        <Badge style={{backgroundColor: "#FEE6DA !important", color: "#3D4B65"}} className="cancle-badge-rounded-pill">
        Payment Failed
      </Badge>
      );
    }

    if (subscription.isCollectionPaused) {
      return (
        
         <Badge style={{backgroundColor: "#FEE6DA !important", color: "#3D4B65"}} className="cancle-badge-rounded-pill">
         Payment Paused
       </Badge>
      );
    }

    if (subscription.isCancelled) {
      return (
        <>
          <Badge
         className="active-badge-rounded-pill"
         style={{ backgroundColor: "rgb(214, 230, 255) !important" ,color: "#3D4B65"}} 
       >
        Active
       </Badge>{" "}
          <Badge style={{backgroundColor: "#FEE6DA !important", color: "#3D4B65"}} className="cancle-badge-rounded-pill">
            Cancel on {formatDate(subscription.cancelAt || "")}
          </Badge>
        </>
      );
    }

    if (subscription.status === "active") {
      return (
         <Badge
         className="active-badge-rounded-pill"
         style={{ backgroundColor: "rgb(214, 230, 255) !important" ,color: "#3D4B65"}} 
       >
        Active
       </Badge>
      );
    }

    if (subscription.status === "canceled") {
      return (
        <Badge style={{backgroundColor: "#FEE6DA", color: "#3D4B65"}} className="cancle-badge-rounded-pill">
          Canceled
        </Badge>
      );
    }

    return (
      <Badge className="ms-md-2">
        {subscription.status.charAt(0).toUpperCase() +
          subscription.status.slice(1)}
      </Badge>
    );
  };

  const formatInterval = (interval: string, interval_count: number = 1) => {
    let formattedInterval = "Month";

    if (interval?.toLowerCase() === "month") {
      formattedInterval =
        interval_count === 1
          ? "Month"
          : interval_count === 3
          ? "Quarter"
          : `Every ${interval_count} months`;
    } else if (interval?.toLowerCase() === "year") {
      formattedInterval =
        interval_count === 1 ? "Annual" : `Every ${interval_count} years`;
    } else if (interval?.toLowerCase() === "day") {
      formattedInterval =
        interval_count === 1
          ? "Daily"
          : interval_count === 7
          ? "Weekly"
          : interval_count === 14
          ? "Bi-weekly"
          : `Every ${interval_count} days`;
    } else if (interval?.toLowerCase() === "week") {
      formattedInterval =
        interval_count === 1
          ? "Weekly"
          : interval_count === 2
          ? "Bi-weekly"
          : `Every ${interval_count} weeks`;
    } else {
      formattedInterval = `Every ${interval_count} ${interval || "period"}(s)`;
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
            className="flex-grow-1"
            style={{
              backgroundColor: "#E1ECFF",
              border: 0,
              borderRadius: "10px",
              color: "#337CFD",
            }}
            onClick={() => confirmReactivateSubscription(subscription.id)}
          >
            {processingSubscriptionId === subscription.id ? (
              <>
                <PageLoader type="spinner" size="sm" className="me-2" />
              </>
            ) : (
              "Renew "
            )}
          </Button>
          <Button
            style={{
              backgroundColor: "#337CFD",
              border: 0,
              borderRadius: "10px",
              color: "#FFFFFF",
            }}
            className="flex-grow-1"
            onClick={() => handleUpdatePlan(subscription.id)}
          >
            Update
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
            style={{
              backgroundColor: "#337CFD",
              border: 0,
              borderRadius: "10px",
              color: "#FFFFFF",
            }}
            className="flex-grow-1"
            onClick={() => handleUpdatePayment(subscription.id)}
          >
            Reactivate
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
            style={{
              backgroundColor: "#E1ECFF",
              border: 0,
              borderRadius: "10px",
              color: "#337CFD",
            }}
            className="flex-grow-1"
            onClick={() => confirmCancelSubscription(subscription.id)}
          >
            {processingSubscriptionId === subscription.id ? (
              <>
                <PageLoader type="spinner" size="sm" className="me-2" />
              </>
            ) : (
              "Cancel"
            )}
          </Button>
          <Button
            style={{
              backgroundColor: "#337CFD",
              border: 0,
              borderRadius: "10px",
              color: "#FFFFFF",
            }}
            className="flex-grow-1"
            onClick={() => handleUpdatePlan(subscription.id)}
          >
            Update
          </Button>
        </>
      );
    }

    return null;
  };

  const renderPaymentMethod = (subscription: Subscription) => {
    if (!subscription.paymentMethod) return null;

    return (
      <div className="payment-info d-flex items-center mt-2">
        <div className="card-icon mr-3">
          {(() => {
            const IconComponent = getCardIcon(subscription.paymentMethod.brand);
            return (
              <>
                {React.isValidElement(IconComponent) ? (
                  IconComponent
                ) : (
                  <FaCreditCard size={26} className="text-gray-800" />
                )}
              </>
            );
          })()}
        </div>
        <div className="card-details d-flex">
          <div
            style={{
              color: "#0C1F3F",
              fontSize: "16px",
            }}
          >
            **** {subscription.paymentMethod.last4}
          </div>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleUpdatePayment(subscription.id);
            }}
            style={{
              color: "#6c757d",
              marginLeft: "5px",
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <Image src="/pencil.svg" alt="Edit" width={20} height={20} />
          </a>
        </div>
      </div>
    );
  };

  const renderSubscriptionCard = (subscription: Subscription) => (
    <div
      key={subscription.id}
      style={{
        border: '1px solid #CFD2D9',
        padding: "16px",
        borderRadius: "16px",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div className="mb-3">
        <div className="d-flex align-items-start">
          <div
            className="me-3 rounded-circle"
            style={{
              width: "60px",
              height: "60px",
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "transparent",
            }}
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
              <FaCube className="text-dark" />
            )}
          </div>
          <div>
            <div
              className="fw-bold"
              style={{ color: "#0C1F3F", fontSize: "16px" }}
            >
              {subscription.device?.deviceName || "My Device"}
            </div>
            <div
              style={{ color: "#0C1F3F", fontSize: "14px" }}
            >
              {formatInterval(
                subscription.interval,
                subscription.interval_count
              )}{" "}
              Plan {getStatusBadge(subscription)}
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
              <span className="subscription-interval fw-bold">
                ${subscription.amount}
              </span>{" "}
              <span style={{color: "#3D4B65", fontSize: "14px"}}>
              per{" "}
              {formatInterval(
                subscription.interval,
                subscription.interval_count
              )}</span>
            </div>
            <div style={{ color: "#0C1F3F", fontSize: "14px" }}>
              {subscription.isCancelled
                ? `Available until ${formatDate(subscription.currentPeriodEnd)}`
                : subscription.isFreeTrial
                ? ` Subscription starts on ${formatDate(
                    subscription.currentPeriodEnd
                  )}`
                : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}

              {subscription.cancelAt && !subscription.isCancelled && (
                <div>Cancels on: {formatDate(subscription.cancelAt)}</div>
              )}
              {subscription.isInGracePeriod &&
                subscription.gracePeriodMessage && (
                  <div className="alert-msg  mt-2 mb-0 py-2 px-3">
                    <FaExclamationTriangle className="me-2" />
                    {subscription.gracePeriodMessage}
                  </div>
                )}
            </div>
            {renderPaymentMethod(subscription)}
          </div>
        </div>
      </div>

      <div className="d-flex" style={{ gap: "10px" }}>
        {renderActiveSubscriptionButtons(subscription)}
      </div>
    </div>
  );

  const renderInactiveSubscriptionCard = (subscription: Subscription) => (
    <div
      key={subscription.id}
      style={{
        border: '1px solid #dee2e6',
        padding: "16px",
        borderRadius: "16px",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div className="mb-3">
        <div className="d-flex align-items-start">
          <div
            className="me-3 rounded-circle"
            style={{
              width: "60px",
              height: "60px",
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "transparent",
            }}
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
              <FaCube className="text-dark" />
            )}
          </div>
          <div>
            <div
              className="fw-bold"
              style={{ color: "#0C1F3F", fontSize: "16px" }}
            >
              {subscription.device?.deviceName || "My Device"}
            </div>

            <div style={{ color: "#3D4B65", fontSize: "14px" }}>
              {subscription.isCancelled
                ? `Available until ${formatDate(subscription.currentPeriodEnd)}`
                : subscription.isFreeTrial
                ? `Subscription starts on  ${formatDate(
                    subscription.currentPeriodEnd
                  )}`
                : `Your subscription renews on  ${formatDate(
                    subscription.currentPeriodEnd
                  )}.`}
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex" style={{ gap: "10px" }}>
        {renderActiveSubscriptionButtons(subscription)}
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
                  {renderSubscriptionCard(subscription)}
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
                  {renderInactiveSubscriptionCard(subscription)}
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
        plans={plans}
        currentPlanId={currentPlanId}
        selectedPlanId={selectedPlanId}
        onPlanSelect={(planId: string) => setSelectedPlanId(planId)}
        reactivateStart={false}
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

      <CancelSubscriptionModal
        show={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        isProcessing={processingSubscriptionId === currentSubscriptionId}
      />

      <ReactivateSubscriptionModal
        show={showReactivateModal}
        onClose={() => setShowReactivateModal(false)}
        onConfirm={handleConfirmReactivate}
        isProcessing={processingSubscriptionId === currentSubscriptionId}
      />
    </>
  );
}
