import { useState, useEffect } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { FaInfoCircle } from "react-icons/fa";

interface Plan {
  id: string;
  name: string;
  description?: string;
  amount: string;
}

interface UpdatePlanModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => any;
  isProcessing: boolean;
  plans: Plan[];
  currentPlanId: string | null;
  selectedPlanId: string | null;
  reactivateStart: boolean;
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
  reactivateStart,
  onPlanSelect,
}: UpdatePlanModalProps) {
  const [localSelectedPlanId, setLocalSelectedPlanId] = useState<string | null>(
    selectedPlanId
  );

  // Sync local state with props
  useEffect(() => {
    setLocalSelectedPlanId(selectedPlanId);
  }, [selectedPlanId, currentPlanId, plans]);

  const handlePlanSelect = (planId: string) => {
    setLocalSelectedPlanId(planId);
    onPlanSelect(planId);
  };

  const handleConfirm = async () => {
    if (localSelectedPlanId) {
      await onConfirm();
    }
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static" keyboard={false}>
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
                    className={`p-3  mb-3 ${
                      localSelectedPlanId === plan.id
                        ? "border-primary bg-light"
                        : ""
                    }`}
                    onClick={() => handlePlanSelect(plan.id)}
                    style={{
                      cursor: "pointer",
                      border: "1px solid #CFD2D9",
                      borderRadius: "25px",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <div>
                          <div
                            className={`fw-medium ${
                              localSelectedPlanId === plan.id
                                ? "text-primary"
                                : ""
                            }`}
                          >
                            {plan.name}
                            {isCurrentPlan && (
                              //  <Badge style={{backgroundColor: "#31C48D !important", color: "#ffffff"}} className="ms-md-2">

                              //   </Badge>
                              <span
                                className="ml-2  text-xs px-2.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: "#D6E6FF",
                                  color: "#3D4B65",
                                }}
                              >
                                Current Plan
                              </span>
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
                          localSelectedPlanId === plan.id ? "text-primary" : ""
                        }`}
                      >
                        ${parseFloat(plan.amount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="alert  mt-4"
              style={{ backgroundColor: "#FEE6DA", color: "#3D4B65" }}
            >
              <FaInfoCircle className="me-2" />
              Your subscription will be updated immediately. You&apos;ll be
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
          style={{
            backgroundColor: "#E1ECFF",
            border: 0,
            borderRadius: "10px",
            color: "#337CFD",
          }}
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          style={{
            backgroundColor: "#337CFD",
            border: 0,
            borderRadius: "10px",
            color: "#FFFFFF",
          }}
          onClick={handleConfirm}
          disabled={
            isProcessing ||
            !localSelectedPlanId ||
            (!reactivateStart && currentPlanId === localSelectedPlanId) // ← allow same plan only when reactivating
          }
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
            "Update"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
