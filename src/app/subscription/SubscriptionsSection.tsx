import React from "react";
import { Accordion, Badge, Button } from "react-bootstrap";
import { FaCube, FaExclamationTriangle } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import Image from "next/image";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface Device {
  deviceName: string;
  deviceImage?: string;
}

interface Subscription {
  id: string;
  status: string;
  amount: string;
  interval: string;
  renewalDate: string;
  cancelAt?: string;
  cancelStatus?: boolean;
  isInGracePeriod?: boolean;
  graceEndDate?: string;
  gracePeriodMessage?: string;
  isCollectionPaused?: boolean;
  resumeAt?: string;
  device?: Device;
  paymentMethod?: PaymentMethod;
  planId: string;
}

interface SubscriptionsSectionProps {
  subscriptions: Subscription[];
  onUpdatePayment: (subscriptionId: string) => void;
  onCancelSubscription: (subscriptionId: string) => void;
  onUpdatePlan: (subscriptionId: string) => void;
  onReactivateSubscription: (subscriptionId: string) => Promise<void>;
  isProcessing: boolean;
}

export default function SubscriptionsSection({
  subscriptions,
  onUpdatePayment,
  onCancelSubscription,
  onUpdatePlan,
  onReactivateSubscription,
  isProcessing,
}: SubscriptionsSectionProps) {
  // Filter active subscriptions
  const activeSubscriptions = subscriptions.filter(
    (sub) =>
      sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "past_due" ||
      sub.isInGracePeriod ||
      (sub.status === "active" && sub.isCollectionPaused)
  );

  // Filter inactive subscriptions
  const inactiveSubscriptions = subscriptions.filter(
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
        <Badge bg="warning" text="dark" className="ms-md-2">
          Free Trial (ends {formatDate(subscription.renewalDate)})
        </Badge>
      );
    }

    if (subscription.isInGracePeriod) {
      return (
        <Badge bg="danger" className="ms-md-2">
          Grace Period
          {subscription.graceEndDate && ` (until ${subscription.graceEndDate})`}
        </Badge>
      );
    }

    if (
      subscription.status === "past_due" ||
      (subscription.status === "active" && subscription.isCollectionPaused)
    ) {
      return (
        <Badge bg="danger" className="ms-md-2">
          Payment Paused
          {subscription.resumeAt && ` (until ${subscription.resumeAt})`}
        </Badge>
      );
    }

    if (
      subscription.status === "active" &&
      subscription.cancelStatus === true
    ) {
      return (
        <>
          <Badge bg="success" className="ms-md-2">
            Active
          </Badge>{" "}
          <Badge bg="danger" className="ms-md-2">
            Cancel on {subscription.cancelAt}
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Accordion defaultActiveKey="0" className="mb-3">
      <Accordion.Item eventKey="0">
        <Accordion.Header>
          <span
            style={{ color: "#0C1F3F", fontSize: "20px", fontWeight: "700" }}
          >
            Subscriptions
          </span>
        </Accordion.Header>
        <Accordion.Body className="p-0" style={{ backgroundColor: "#f8f9fa" }}>
          <div className=" pb-2 pt-2 px-3">
            <span
              style={{ color: "#0C1F3F", fontSize: "18px", fontWeight: "600" }}
            >
              Active Subscriptions
            </span>
          </div>

          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 ? (
            activeSubscriptions.map((subscription) => (
              <div key={subscription.id} className="p-3">
                <div
                  key={subscription.id}
                  style={{
                    border: "1px solid #CFD2D9",
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
                          width: "60px",
                          height: "60px",
                          flexShrink: 0,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
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
                        </div>
                        <div style={{ color: "#0C1F3F", fontSize: "14px" }}>
                          {subscription.interval} Plan{" "}
                          {getStatusBadge(subscription)}
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
                          per {subscription.interval}
                        </div>
                        <div style={{ color: "#0C1F3F", fontSize: "14px" }}>
                          {subscription.cancelStatus
                            ? `Available until ${formatDate(
                                subscription.renewalDate
                              )}`
                            : `Renews on ${formatDate(
                                subscription.renewalDate
                              )}`}
                          {subscription.cancelAt &&
                            !subscription.cancelStatus && (
                              <div>
                                Cancels on: {formatDate(subscription.cancelAt)}
                              </div>
                            )}
                          {subscription.isInGracePeriod &&
                            subscription.gracePeriodMessage && (
                              <div className="alert alert-warning mt-2 mb-0 py-2 px-3">
                                <FaExclamationTriangle className="me-2" />
                                {subscription.gracePeriodMessage}
                              </div>
                            )}
                        </div>
                        {subscription.paymentMethod && (
                          <div className="d-flex align-items-center  mt-1">
                            <div
                              style={{
                                backgroundColor: "#1A62CB",
                                color: "white",
                                fontSize: "11px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                marginRight: "8px",
                              }}
                            >
                              VISA
                            </div>
                            <span
                              style={{ color: "#0C1F3F", fontSize: "14px" }}
                            >
                              **** {subscription.paymentMethod.last4}
                            </span>
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                onUpdatePayment(subscription.id);
                              }}
                              style={{ color: "#6c757d", marginLeft: "18px" }}
                            >
                              <MdEdit size={24} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex" style={{ gap: "10px" }}>
                    {subscription.status === "active" &&
                    !subscription.cancelStatus ? (
                      <>
                        <Button
                          variant="outline-primary"
                          className="flex-grow-1 "
                          style={{ borderRadius: "10px" }}
                          onClick={() => onCancelSubscription(subscription.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          style={{ borderRadius: "10px" }}
                          className="flex-grow-1 "
                          onClick={() => onUpdatePlan(subscription.id)}
                        >
                          Update Plan
                        </Button>
                      </>
                    ) : subscription.status === "active" &&
                      subscription.cancelStatus ? (
                      <>
                        <Button
                          variant="outline-primary"
                          className="flex-grow-1 "
                          style={{ borderRadius: "10px" }}
                          onClick={() =>
                            onReactivateSubscription(subscription.id)
                          }
                        >
                          Renew Subscription
                        </Button>
                        <Button
                          variant="primary"
                          style={{ borderRadius: "10px" }}
                          className="flex-grow-1 "
                          onClick={() => onUpdatePlan(subscription.id)}
                        >
                          Update Plan
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="btn btn-outline-success"
                        onClick={() =>
                          onReactivateSubscription(subscription.id)
                        }
                      >
                        Renew Subscription
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-muted">
              No active subscriptions found.
            </div>
          )}

          <div className=" pb-2 pt-2 px-3 ">
            <span
              style={{ color: "#0C1F3F", fontSize: "18px", fontWeight: "600" }}
            >
              Inactive Subscriptions
            </span>
          </div>

          {/* Inactive Subscriptions */}
          {inactiveSubscriptions.length > 0 ? (
            inactiveSubscriptions.map((subscription) => (
              <div key={subscription.id} className="p-3">
                <div
                  key={subscription.id}
                  style={{
                    border: "1px solid #dee2e6",
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "white",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  <div className="mb-3">
                    <div className="d-flex align-items-center">
                      <div
                        className="me-3 rounded-circle"
                        style={{
                          width: "50px",
                          height: "50px",
                          backgroundColor: "#E8E8E8",
                          flexShrink: 0,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
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
                        <div className="fw-bold" style={{ fontSize: "16px" }}>
                          {subscription.device?.deviceName || "Sentech Testing"}
                          <span style={{ fontWeight: "normal", color: "#666" }}>
                            {subscription.device?.deviceName
                              ? " (My Accord)"
                              : ""}
                          </span>
                        </div>
                        <div style={{ color: "#666", fontSize: "14px" }}>
                          Your subscription renews on{" "}
                          {new Date(
                            subscription.renewalDate
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-100 rounded-pill"
                    onClick={() => onReactivateSubscription(subscription.id)}
                    disabled={isProcessing}
                  >
                    Reactivate
                  </Button>
                </div>
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
  );
}
