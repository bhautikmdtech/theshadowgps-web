import { Modal, Button, Spinner } from "react-bootstrap";

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
  isProcessing,
}: ReactivateSubscriptionModalProps) {
  return (
    <Modal show={show} onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Renew Subscription?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Your payment method will be charged, and services will resume right
        away.
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
            " Renew"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
