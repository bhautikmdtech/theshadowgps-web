import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";

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
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Bootstrap modal
    const initModal = async () => {
      if (typeof document !== 'undefined' && modalRef.current) {
        try {
          // Dynamic import to avoid server-side rendering issues
          const bootstrap = await import('bootstrap');
          
          // Get the modal element and initialize it
          const modalElement = modalRef.current;
          const modal = new bootstrap.Modal(modalElement);
          
          // Show or hide based on prop
          if (show) {
            modal.show();
          } else {
            modal.hide();
          }
          
          // Add event listener to call onClose when modal is hidden
          modalElement.addEventListener('hidden.bs.modal', () => {
            onClose();
          });
          
        } catch (error) {
          console.error('Failed to initialize Bootstrap modal:', error);
        }
      }
    };

    initModal();
    
    // Cleanup on unmount
    return () => {
      if (modalRef.current) {
        modalRef.current.removeEventListener('hidden.bs.modal', onClose);
      }
    };
  }, [show, onClose]);

  return (
    <div 
      className="modal fade" 
      id="reactivateSubscriptionModal" 
      tabIndex={-1} 
      aria-labelledby="reactivateSubscriptionModalLabel" 
      aria-hidden="true"
      ref={modalRef}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="reactivateSubscriptionModalLabel">Renew Subscription</h5>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close"
              onClick={onClose}
              disabled={isProcessing}
            ></button>
          </div>
          <div className="modal-body">
            <div className="text-center mb-4">
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="text-primary"
                size="3x"
              />
            </div>
            <p className="mb-3">
              Are you sure you want to renew your subscription?
            </p>
            <div className="alert alert-info">
              <p className="mb-0">
                Your subscription will be reactivated immediately and you'll be billed for the next billing period.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                  Processing...
                </>
              ) : (
                "Renew Subscription"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 