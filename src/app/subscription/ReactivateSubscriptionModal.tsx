import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaInfoCircle } from "react-icons/fa";

interface ReactivateSubscriptionModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export default function ReactivateSubscriptionModal({
  show,
  onClose,
  onConfirm,
  isProcessing
}: ReactivateSubscriptionModalProps) {
  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={!isProcessing}
      aria-labelledby="reactivateSubscriptionModalLabel"
    >
      <Modal.Header closeButton>
        <Modal.Title id="reactivateSubscriptionModalLabel">Renew Subscription</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center mb-4">
          <FaInfoCircle
            className="text-primary"
            size="3em"
          />
        </div>
        <p className="mb-3">
          Are you sure you want to renew your subscription?
        </p>
        <div className="alert alert-info">
          <p className="mb-0">
            Your subscription will be reactivated immediately and you&apos;ll be billed for the next billing period.
          </p>
        </div>
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
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Processing...
            </>
          ) : (
            "Renew Subscription"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 