import { useState } from 'react';
import { Modal, Button, Form, Badge, Spinner } from 'react-bootstrap';
import { FaInfoCircle } from 'react-icons/fa';

interface Plan {
  id: string;
  name: string;
  description?: string;
  amount: string;
}

interface UpdatePlanModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  plans: Plan[];
  currentPlanId: string | null;
  selectedPlanId: string | null;
  onPlanSelect: (planId: string) => void;
}

export default function UpdatePlanModal({
  show,
  onClose,
  onConfirm,
  isProcessing,
  plans,
  currentPlanId,
  selectedPlanId,
  onPlanSelect
}: UpdatePlanModalProps) {

  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Update Subscription Plan</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {plans && plans.length > 0 ? (
          <div>
            <h6 className="mb-3">Select a plan</h6>
            <div id="available-plans-list">
              {plans.map((plan: Plan) => {
                const isCurrentPlan = currentPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`p-3 border rounded mb-3 ${
                      selectedPlanId === plan.id
                        ? "border-primary bg-light"
                        : ""
                    }`}
                    onClick={() => onPlanSelect(plan.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <Form.Check
                          type="radio"
                          id={`plan-${plan.id}`}
                          name="subscription-plan"
                          className="me-3"
                          checked={selectedPlanId === plan.id}
                          onChange={() => onPlanSelect(plan.id)}
                        />
                        <div>
                          <div
                            className={`fw-medium ${
                              selectedPlanId === plan.id
                                ? "text-primary"
                                : ""
                            }`}
                          >
                            {plan.name}
                            {isCurrentPlan && (
                              <Badge bg="success" className="ms-2">
                                Current Plan
                              </Badge>
                            )}
                          </div>
                          {plan.description && (
                            <small className="text-muted d-block">
                              {plan.description}
                            </small>
                          )}
                        </div>
                      </div>
                      <div
                        className={`fw-bold ${
                          selectedPlanId === plan.id ? "text-primary" : ""
                        }`}
                      >
                        ${parseFloat(plan.amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="alert alert-info mt-4">
              <FaInfoCircle className="me-2" />
              Your subscription will be updated immediately. You'll be
              charged the prorated amount for the remainder of your billing
              period.
            </div>
          </div>
        ) : (
          <div className="alert alert-info">
            No plans available at this time. Please try again later.
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={isProcessing || !selectedPlanId || currentPlanId === selectedPlanId}
        >
          {isProcessing ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Processing...
            </>
          ) : (
            "Update Plan"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 