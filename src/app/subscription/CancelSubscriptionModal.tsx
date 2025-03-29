import { useEffect, useRef } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

interface CancelSubscriptionModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  billingEndDate: string;
}

export default function CancelSubscriptionModal({
  show,
  onClose,
  onConfirm,
  isProcessing,
  billingEndDate
}: CancelSubscriptionModalProps) {

  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Cancel Subscription</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center mb-4">
          <FaExclamationTriangle className="text-warning" size={48} />
        </div>
        <p className="mb-3">
          Are you sure you want to cancel your subscription?
        </p>
        <div className="alert alert-info">
          <p className="mb-0">
            Your subscription will remain active until the end of your
            billing period on{" "}
            <span className="fw-bold">{billingEndDate}</span>.
          </p>
        </div>
        <p className="text-muted">
          You can renew your subscription at any time before the end of your
          billing period.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onClose}
          disabled={isProcessing}
        >
          Keep Subscription
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isProcessing}
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
            "Cancel Subscription"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 