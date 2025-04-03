import React, { useState, useRef, useEffect } from 'react';
import { Accordion } from 'react-bootstrap';
import { FaCheck, FaTrash, FaEllipsisV } from 'react-icons/fa';
import { FaCirclePlus } from 'react-icons/fa6';
interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface PaymentMethodsSectionProps {
  paymentMethods: PaymentMethod[];
  handleAddPaymentMethod: () => void;
  handleMakeDefaultPaymentMethod: (paymentMethodId: string) => Promise<void>;
  handleDeletePaymentMethod: (paymentMethodId: string) => Promise<void>;
  isProcessing: boolean;
}

export default function PaymentMethodsSection({
  paymentMethods,
  handleAddPaymentMethod,
  handleMakeDefaultPaymentMethod,
  handleDeletePaymentMethod,
  isProcessing,
}: PaymentMethodsSectionProps) {
  // State to track which dropdown is open
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  // Create refs for each dropdown menu
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Helper function to get card label from the brand
  const getCardLabel = (brand: string): string => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  // Toggle dropdown with Tailwind
  const toggleDropdown = (paymentMethodId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setOpenDropdownId(
      openDropdownId === paymentMethodId ? null : paymentMethodId
    );
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // If open dropdown and click is outside of any dropdown content
      if (
        openDropdownId &&
        dropdownRefs.current[openDropdownId] &&
        !dropdownRefs.current[openDropdownId]?.contains(event.target as Node)
      ) {
        setOpenDropdownId(null);
      }
    }

    // Add event listener only if a dropdown is open
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  return (
    <Accordion defaultActiveKey='0' className='mb-3 border-0'>
      <Accordion.Item eventKey='0' className="border-0">
        <Accordion.Header className="bg-white">
          <span
            style={{ color: '#0C1F3F', fontSize: '20px', fontWeight: '700' }}
          >
            Payment Methods
          </span>
        </Accordion.Header>
        <Accordion.Body className='p-3' >
          {/* Display Payment Methods */}
          {paymentMethods.length > 0 ? (
            <div className='payment-methods-list'>
              {paymentMethods.map((method: PaymentMethod) => (
                <div
                  key={method.id}
                  className='payment-method flex justify-between items-center py-2 border-b'
                >
                  <div className='payment-info flex items-center'>
                    <div
                      style={{
                        backgroundColor:
                          method.brand.toLowerCase() === 'visa'
                            ? '#1A62CB'
                            : method.brand.toLowerCase() === 'mastercard'
                            ? '#EB001B'
                            : method.brand.toLowerCase() === 'amex'
                            ? '#b76e79'
                            : method.brand.toLowerCase() === 'discover'
                            ? '#FF6600'
                            : method.brand.toLowerCase() === 'diners'
                            ? '#000000'
                            : method.brand.toLowerCase() === 'jcb'
                            ? '#C0C0C0' 
                            : '#777777', 
                        color: 'white',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginRight: '8px',
                      }}
                    >
                      {method.brand.toUpperCase()}
                    </div>
                    <div className='card-details'>
                      <div
                        className='card-number'
                        style={{
                          color: '#0C1F3F',
                          fontSize: '16px',
                          fontWeight: '600',
                        }}
                      >
                        {getCardLabel(method.brand)} **** {method.last4}
                        {method.isDefault && (
                          <span
                            className='ml-2 bg-blue-500 text-white text-xs px-2.5 py-0.5 rounded-full'
                            style={{ color: '#0C1F3F' }}
                          >
                            Default
                          </span>
                        )}
                      </div>
                      <div
                        className='card-expiry text-gray-500 text-sm'
                        style={{ color: '#0C1F3F', fontSize: '14px' }}
                      >
                        Expires {method.expMonth}/{method.expYear}
                      </div>
                    </div>
                  </div>
                  <div className='payment-actions relative'>
                    <button
                      type='button'
                      onClick={(e) => toggleDropdown(method.id, e)}
                      className='text-gray-600 hover:text-gray-800 p-1 focus:outline-none'
                      aria-expanded={openDropdownId === method.id}
                    >
                      <FaEllipsisV />
                    </button>

                    {openDropdownId === method.id && (
                      <div
                        ref={(el) => {
                          dropdownRefs.current[method.id] = el;
                        }}
                        className='absolute right-0 z-50 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'
                      >
                        <div className='py-1'>
                          {!method.isDefault && (
                            <button
                              type='button'
                              className='flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                              onClick={() => {
                                handleMakeDefaultPaymentMethod(method.id);
                                setOpenDropdownId(null);
                              }}
                              disabled={isProcessing}
                            >
                              <FaCheck className='mr-2' />
                              Make Default
                            </button>
                          )}
                          <button
                            type='button'
                            className='flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100'
                            onClick={() => {
                              handleDeletePaymentMethod(method.id);
                              setOpenDropdownId(null);
                            }}
                            disabled={isProcessing}
                          >
                            <FaTrash className='mr-2' />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div
                className='add-payment-btn mt-3 flex items-center cursor-pointer text-blue-600 '
                onClick={handleAddPaymentMethod}
              >
                <FaCirclePlus className='mr-2 ' size={24} />
                <span>Add payment method</span>
              </div>
            </div>
          ) : (
            <div
              className='add-payment-btn flex items-center cursor-pointer text-blue-600 '
              onClick={handleAddPaymentMethod}
            >
              <FaCirclePlus className='mr-2' size={24} />
              <span>Add payment method</span>
            </div>
          )}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}
