import { Modal, Button, Spinner } from 'react-bootstrap';

interface CancelSubscriptionModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export default function CancelSubscriptionModal({
  show,
  onClose,
  onConfirm,
  isProcessing,
}: CancelSubscriptionModalProps) {
  return (
    <Modal show={show} onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Cancel Subscription?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
      You’ll lose access to alerts and services immediately. You can reactivate anytime.
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
          No, Keep It
        </Button>
        <Button
          style={{
            backgroundColor: "#337CFD",
            border: 0,
            borderRadius: "10px",
            color: "#FFFFFF",
          }}
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
            "Yes, Cancel"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 