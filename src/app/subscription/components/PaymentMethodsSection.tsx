import React, { useState, useRef, useEffect } from "react";
import { Accordion, Modal, Button } from "react-bootstrap";
import { FaCheck, FaTrash, FaEllipsisV, FaCreditCard } from "react-icons/fa";
import { SubscriptionService } from "./subscriptionService";
import { toast } from "react-toastify";
import Image from "next/image";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { Customer, PaymentMethod } from "./types";

interface PaymentMethodsSectionProps {
  token: string;
  paymentMethods: PaymentMethod[];
  customer: Customer;
  handleAddPaymentMethod: () => void;
  onRefresh: () => void;
}

export default function PaymentMethodsSection({
  token,
  paymentMethods,
  customer,
  handleAddPaymentMethod,
  onRefresh,
}: PaymentMethodsSectionProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const getCardIcon = (brand: string): React.ReactNode => {
    const brands: Record<string, React.ReactNode> = {
      visa: <PaymentIcon type="Visa" format="flatRounded" width={30} />,
      mastercard: (
        <PaymentIcon type="Mastercard" format="flatRounded" width={30} />
      ),
      amex: <PaymentIcon type="Amex" format="flatRounded" width={30} />,
      discover: <PaymentIcon type="Discover" format="flatRounded" width={30} />,
      diners: <PaymentIcon type="Diners" format="flatRounded" width={30} />,
      jcb: <PaymentIcon type="Jcb" format="flatRounded" width={30} />,
    };

    return brands[brand.toLowerCase()] || <FaCreditCard />;
  };
  const getCardLabel = (brand: string): string => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const toggleDropdown = (paymentMethodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(
      openDropdownId === paymentMethodId ? null : paymentMethodId
    );
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        openDropdownId &&
        dropdownRefs.current[openDropdownId] &&
        !dropdownRefs.current[openDropdownId]?.contains(event.target as Node)
      ) {
        setOpenDropdownId(null);
      }
    }

    if (openDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdownId]);

  const handleMakeDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      if (!customer?.id) {
        throw new Error("Customer information is missing");
      }
      setIsProcessing(true);
      await SubscriptionService.makeDefaultPaymentMethod(
        token,
        customer?.id,
        paymentMethodId
      );

      await onRefresh();
      setIsProcessing(false);
      toast.success("Default payment method updated successfully");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to set default payment method";
      toast.error(errorMessage);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    try {
      if (!customer?.id) {
        throw new Error("Customer information is missing");
      }
      setIsProcessing(true);
      await SubscriptionService.deletePaymentMethod(token, paymentMethodId);

      await onRefresh();
      setIsProcessing(false);
      toast.success("Default payment method updated successfully");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to set default payment method";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (methodId: string) => {
    setSelectedPaymentMethodId(methodId);
    setShowDeleteModal(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedPaymentMethodId) {
      await handleDeletePaymentMethod(selectedPaymentMethodId);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <Accordion defaultActiveKey="0" className="mb-3 border-0">
        <Accordion.Item eventKey="0" className="border-0">
          <Accordion.Header className="bg-white">
            <span
              style={{ color: "#0C1F3F", fontSize: "18px", fontWeight: "700" }}
            >
              Payment Methods
            </span>
          </Accordion.Header>
          <Accordion.Body className="p-3">
            {/* Display Payment Methods */}
            {paymentMethods.length > 0 ? (
              <div className="payment-methods-list">
                {paymentMethods.map((method: PaymentMethod) => (
                  <div
                    key={method.id}
                    className="payment-method flex justify-between items-center py-2 border-b"
                  >
                    <div className="payment-info flex items-center">
                      <div className="card-icon mr-3">
                        {(() => {
                          const IconComponent = getCardIcon(method.brand);
                          return (
                            <>
                              {React.isValidElement(IconComponent) ? (
                                IconComponent
                              ) : (
                                <FaCreditCard
                                  size={26}
                                  className="text-gray-800"
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="card-details">
                        <div
                          className="card-number"
                          style={{
                            color: "#0C1F3F",
                            fontSize: "16px",
                            fontWeight: "600",
                          }}
                        >
                          {getCardLabel(method.brand)} **** {method.last4}
                          {method.isDefault && (
                            <span
                              className="ml-2  text-xs px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#D6E6FF",
                                color: "#3D4B65",
                                fontSize: "12px",
                              }}
                            >
                              Default
                            </span>
                          )}
                          {method.expired && (
                            <span
                              className="ml-2  text-xs px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#fee6da",
                                color: "#3d4b65",
                                fontSize: "12px",
                              }}
                            >
                              Expired
                            </span>
                          )}
                          {method.expiredSoon && (
                            <span
                              className="ml-2  text-xs px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#fee6da",
                                color: "#3d4b65",
                                fontSize: "12px",
                              }}
                            >
                              Expired Soon
                            </span>
                          )}
                        </div>
                        <div
                          className="card-expiry text-gray-500 text-sm"
                          style={{ color: "#0C1F3F", fontSize: "14px" }}
                        >
                          Expires {method.expMonth}/{method.expYear}
                        </div>
                      </div>
                    </div>
                    {
                      (!method.isDefault || !method.isSub)
                      &&
                      <div className="payment-actions relative">
                      <button
                        type="button"
                        onClick={(e) => toggleDropdown(method.id, e)}
                        className="text-gray-600 hover:text-gray-800 p-1 focus:outline-none"
                        aria-expanded={openDropdownId === method.id}
                      >
                        <FaEllipsisV />
                      </button>

                      {openDropdownId === method.id && (
                        <div
                          ref={(el) => {
                            dropdownRefs.current[method.id] = el;
                          }}
                          className="absolute right-0 z-50 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          <div className="py-1">
                            {!method.isDefault && (
                              <button
                                type="button"
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  handleMakeDefaultPaymentMethod(method.id);
                                  setOpenDropdownId(null);
                                }}
                                disabled={isProcessing}
                              >
                                <FaCheck className="mr-2" />
                                Make Default
                              </button>
                            )}
                            {!method.isSub
                              &&
                              <button
                              type="button"
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                              onClick={() => handleDeleteClick(method.id)}
                              disabled={isProcessing}
                            >
                              <FaTrash className="mr-2" />
                              Delete
                            </button>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    }
                  </div>
                ))}
                <div
                  className="add-payment-btn mt-3 flex items-center cursor-pointer gap-2 "
                  onClick={handleAddPaymentMethod}
                >
                  <Image
                    src="/add-circle.svg"
                    alt="Edit"
                    width={24}
                    height={24}
                  />
                  <span>Add payment method</span>
                </div>
              </div>
            ) : (
              <div
                className="add-payment-btn flex items-center cursor-pointer gap-2 "
                onClick={handleAddPaymentMethod}
                style={{ color: "#0C1F3F" }}
              >
                {" "}
                <Image
                  src="/add-circle.svg"
                  alt="Edit"
                  width={24}
                  height={24}
                />
                <span>Add payment method</span>
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Payment Method?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Deleting this card may interrupt your subscription if no backup is
          available.
        </Modal.Body>
        <Modal.Footer>
          <Button
            style={{
              backgroundColor: "#E1ECFF",
              border: 0,
              borderRadius: "10px",
              color: "#337CFD",
            }}
            onClick={() => setShowDeleteModal(false)}
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
            onClick={handleConfirmDelete}
            disabled={isProcessing}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
