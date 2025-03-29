import React from 'react';
import { Accordion, Badge, Button } from 'react-bootstrap';
import { FaCube, FaEdit, FaExclamationTriangle } from 'react-icons/fa';

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
  getCardIcon: (brand: string) => any;
}

export default function SubscriptionsSection({
  subscriptions,
  onUpdatePayment,
  onCancelSubscription,
  onUpdatePlan,
  onReactivateSubscription,
  isProcessing,
  getCardIcon
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

  return (
    <Accordion defaultActiveKey="0" className="mb-3">
      <Accordion.Item eventKey="0" className="border">
        <Accordion.Header>
          <span className="fw-medium">Subscriptions</span>
        </Accordion.Header>
        <Accordion.Body className="p-0">
          <div className="border-bottom pb-2 pt-2 px-3 bg-light">
            <span className="fw-medium">Active Subscriptions</span>
          </div>

          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 ? (
            activeSubscriptions.map((subscription) => (
              <div key={subscription.id} className="border-bottom p-3">
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center">
                    <div
                      className="me-3"
                      style={{
                        width: "50px",
                        height: "50px",
                        flexShrink: 0,
                      }}
                    >
                      {subscription.device?.deviceImage ? (
                        <img
                          src={subscription.device.deviceImage}
                          alt="Device"
                          className="w-100 h-100 rounded-circle"
                          style={{
                            objectFit: "cover",
                            border: "1px solid #dee2e6",
                          }}
                        />
                      ) : (
                        <div className="bg-primary rounded-circle d-flex justify-content-center align-items-center w-100 h-100">
                          <FaCube className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="fw-bold">
                        {subscription.device?.deviceName ||
                          "Unknown Device"}
                      </div>
                      <div className="d-flex align-items-center">
                        <small className="text-muted me-2">
                          Monthly Plan
                        </small>
                        <small className="badge bg-success rounded-pill px-2 py-1">
                          Active
                        </small>
                      </div>
                      <div className="fw-medium">
                        ${subscription.amount} per {subscription.interval}
                      </div>
                      <div className="text-muted small">
                        {subscription.cancelStatus
                          ? `Available until ${new Date(
                              subscription.renewalDate
                            ).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}`
                          : `Renews on ${new Date(
                              subscription.renewalDate
                            ).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}`}
                        {subscription.cancelAt &&
                          !subscription.cancelStatus && (
                            <div>
                              Cancels on:{" "}
                              {new Date(
                                subscription.cancelAt
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          )}
                      </div>

                      {subscription.isInGracePeriod &&
                        subscription.gracePeriodMessage && (
                          <div className="alert alert-warning mt-2 mb-0 py-2 px-3 small">
                            <FaExclamationTriangle className="me-2" />
                            {subscription.gracePeriodMessage}
                          </div>
                        )}

                      {subscription.paymentMethod && (
                        <div className="text-muted mt-1 d-flex align-items-center">
                          {(() => {
                            const IconComponent = getCardIcon(
                              subscription.paymentMethod.brand
                            );
                            return (
                              <IconComponent className="me-1" size={12} />
                            );
                          })()}
                          <span className="me-2">
                            ****{subscription.paymentMethod.last4}
                          </span>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              onUpdatePayment(subscription.id);
                            }}
                            style={{ color: "#6c757d" }}
                          >
                            <FaEdit size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="d-flex gap-2 align-items-end">
                    {!subscription.cancelStatus ? (
                      <>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => onCancelSubscription(subscription.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => onUpdatePlan(subscription.id)}
                        >
                          Update
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => onReactivateSubscription(subscription.id)}
                          disabled={isProcessing}
                        >
                          Renew
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => onUpdatePlan(subscription.id)}
                        >
                          Update
                        </Button>
                      </>
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

          <div className="border-bottom pb-2 pt-3 px-3 bg-light">
            <span className="fw-medium">Inactive Subscriptions</span>
          </div>

          {/* Inactive Subscriptions */}
          {inactiveSubscriptions.length > 0 ? (
            inactiveSubscriptions.map((subscription) => (
              <div key={subscription.id} className="border-bottom p-3">
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center">
                    <div
                      className="bg-secondary rounded-circle d-flex justify-content-center align-items-center me-3"
                      style={{
                        width: "40px",
                        height: "40px",
                        flexShrink: 0,
                      }}
                    >
                      {subscription.device?.deviceImage ? (
                        <img
                          src={subscription.device.deviceImage}
                          alt="Device"
                          className="w-100 h-100 rounded-circle"
                        />
                      ) : (
                        <FaCube className="text-white" />
                      )}
                    </div>
                    <div>
                      <div className="fw-bold">
                        {subscription.device?.deviceName ||
                          "Unknown Device"}
                      </div>
                      <div className="d-flex align-items-center">
                        <small className="text-muted me-2">
                          Monthly Plan
                        </small>
                        <small className="badge bg-secondary rounded-pill">
                          Inactive
                        </small>
                      </div>
                      <div className="fw-medium">
                        ${subscription.amount} per {subscription.interval}
                      </div>
                      <div className="text-muted small">
                        Ended on{" "}
                        {new Date(
                          subscription.renewalDate
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        onReactivateSubscription(subscription.id)
                      }
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Renew"}
                    </Button>
                  </div>
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