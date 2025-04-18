"use client";

import { useEffect, useState } from "react";
import {
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiExclamationCircle,
} from "react-icons/hi";

interface PaymentStatusViewerProps {
  status: string;
  response: {
    transaction_id?: string;
    status?: "success" | "pending" | "failed" | "cancelled" | "error";
    title?: string;
    message?: string;
    deviceName?: string;
    nextStep?: string;
    supportEmail?: string;
    subscriptionDetails?: {
      status?: string;
      renewalDate?: string;
      interval?: string;
      amount?: string;
      currency?: string;
      isTrial?: boolean;
      trialEnd?: string;
    };
    error?: string;
  };
}

export default function PaymentStatusViewer({
  response,
  status,
}: PaymentStatusViewerProps) {
  const [isWebView, setIsWebView] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  const sendWebViewMessage = (data: any) => {
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      try {
        const message = JSON.stringify(data);
        (window as any).ReactNativeWebView.postMessage(message);
        console.log("Sent to WebView:", message);
      } catch (error) {
        console.error("Error sending to WebView:", error);
      }
    }
  };

  useEffect(() => {
    // Check if running in WebView
    setIsWebView(!!(window as any).ReactNativeWebView);

    const paymentData = {
      transactionId: response.transaction_id,
      status: response.status,
      message: response.message,
      subscriptionDetails: response.subscriptionDetails,
    };

    // Store in sessionStorage (for web fallback)
    sessionStorage.setItem("paymentData", JSON.stringify(paymentData));

    sendWebViewMessage(paymentData);

    if (status === "success") {
      // First close attempt
      sendWebViewMessage({
        action: "close",
        status: "success",
        autoClose: true,
      });

      // Fallback close attempt after delay
      const timer = setTimeout(() => {
        sendWebViewMessage({
          action: "close",
          status: "success",
          autoClose: true,
          fallback: true,
        });
      }, 500);

      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShowCloseButton(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [response]);

  const handleClose = () => {
    sendWebViewMessage({
      action: "close",
      manual: true,
    });
  };

  if (response.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-3 border-red-500 bg-red-50">
          <div className="mx-auto text-red-500 w-12 h-12 mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <HiXCircle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Payment Error
          </h1>
          <p className="text-gray-600">{response.error}</p>
        </div>
      </div>
    );
  }

  const title =
    response.title ||
    (response.status === "success"
      ? "Payment Successful!"
      : response.status === "pending"
      ? "Processing Payment"
      : "Payment Failed");

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div
        className={`bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-3 ${
          response.status === "success"
            ? "border-green-500 bg-green-50"
            : response.status === "pending"
            ? "border-yellow-500 bg-yellow-50"
            : "border-red-500 bg-red-50"
        }`}
      >
        {/* Icon */}
        <div
          className={`mx-auto w-24 h-24 mb-6 rounded-full flex items-center justify-center ${
            status === "success"
              ? "text-green-500 bg-green-100"
              : status === "pending"
              ? "text-yellow-500 bg-yellow-100"
              : "text-red-500 bg-red-100"
          }`}
        >
          {status === "success" ? (
            <HiCheckCircle className="w-16 h-16" />
          ) : status === "pending" ? (
            <HiClock className="w-16 h-16" />
          ) : (
            <HiExclamationCircle className="w-16 h-16" />
          )}
        </div>

        {/* Title */}
        <h1
          className={`text-2xl font-bold mb-4 ${
            status === "success"
              ? "text-green-600"
              : status === "pending"
              ? "text-yellow-600"
              : "text-red-600"
          }`}
        >
          {title}
        </h1>

        {/* Transaction ID */}
        {response.transaction_id && (
          <p className="mb-4">
            Transaction ID:{" "}
            <span className="font-medium bg-gray-100 px-3 py-1 rounded-full text-sm">
              {response.transaction_id.slice(0, 8)}...
              {response.transaction_id.slice(-4)}
            </span>
          </p>
        )}

        {/* Message */}
        {response.message && (
          <p className="text-gray-700 mb-6">{response.message}</p>
        )}

        {/* Device Name */}
        {status === "success" && response.deviceName && (
          <p className="text-gray-700 mb-6">
            Your device <strong>{response.deviceName}</strong> is now ready to
            use!
          </p>
        )}

        {/* Subscription Details */}
        {status === "success" && response.subscriptionDetails && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="text-lg font-semibold border-b border-gray-200 pb-3 mb-4 flex items-center">
              Subscription Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">
                  {response.subscriptionDetails.interval || "Monthly"} Plan
                  {response.subscriptionDetails.isTrial && (
                    <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Trial
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  {response.subscriptionDetails.currency?.toUpperCase() ||
                    "USD"}{" "}
                  {response.subscriptionDetails.amount || "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">
                  {response.subscriptionDetails.status
                    ? response.subscriptionDetails.status
                        .charAt(0)
                        .toUpperCase() +
                      response.subscriptionDetails.status.slice(1)
                    : "Active"}
                  {(!response.subscriptionDetails.status ||
                    response.subscriptionDetails.status === "active") && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Active
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {response.subscriptionDetails.isTrial
                    ? "Trial Ends:"
                    : "Next Renewal:"}
                </span>
                <span className="font-medium">
                  {response.subscriptionDetails.isTrial
                    ? response.subscriptionDetails.trialEnd || "N/A"
                    : response.subscriptionDetails.renewalDate || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {response.nextStep && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              Next Steps
            </h3>
            <p className="text-gray-700">{response.nextStep}</p>
          </div>
        )}

        {/* Close Button */}
        {isWebView && showCloseButton && (
          <button
            onClick={handleClose}
            className={`mt-4 px-6 py-3 rounded-full text-white font-medium w-full ${
              status === "success"
                ? "bg-green-600 hover:bg-green-700"
                : status === "pending"
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Return to App
          </button>
        )}

        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
          &copy; {new Date().getFullYear()} ShadowGPS - All rights reserved
        </div>
      </div>
    </div>
  );
}
