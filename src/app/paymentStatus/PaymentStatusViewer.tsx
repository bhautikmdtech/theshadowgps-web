"use client";

import { useEffect, useState } from "react";
import {
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiExclamationCircle,
} from "react-icons/hi";

interface PaymentStatusViewerProps {
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
}: PaymentStatusViewerProps) {
  console.log(response);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">(
    "other"
  );
  const [isWebView, setIsWebView] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  // Function to send message to WebView
  const sendWebViewMessage = (data: any) => {
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      try {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify(data));
        console.log("Message sent to WebView:", data);
      } catch (e) {
        console.error("Error posting to WebView:", e);
      }
    }
  };

  useEffect(() => {
    // Check if we're in a WebView
    const webViewDetected = !!(window as any).ReactNativeWebView;
    setIsWebView(webViewDetected);

    // Platform detection
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "other");

    // Build data object for WebView
    const dataObject = {
      transactionId: response.transaction_id || "",
      status: response.status || "",
      message: response.message || "",
      subscriptionDetails: response.subscriptionDetails || null,
    };

    // Store in sessionStorage for web access
    try {
      sessionStorage.setItem("paymentData", JSON.stringify(dataObject));
    } catch (e) {
      console.error("Error saving to sessionStorage:", e);
    }

    // WebView communication
    if (webViewDetected) {
      // Initial message with all data
      sendWebViewMessage(dataObject);

      // Auto-close on success
      if (response.status === "success") {
        console.log("Payment successful, sending close action");

        // First close attempt
        sendWebViewMessage({
          action: "close",
          status: "success",
          autoClose: true,
        });

        // Fallback close attempt after delay
        const fallbackTimer = setTimeout(() => {
          sendWebViewMessage({
            action: "close",
            status: "success",
            autoClose: true,
            fallback: true,
          });
        }, 500);

        return () => clearTimeout(fallbackTimer);
      } else {
        // Show close button after delay for non-success states
        const closeButtonTimer = setTimeout(() => {
          setShowCloseButton(true);
        }, 1500);

        return () => clearTimeout(closeButtonTimer);
      }
    } else {
      console.log("Not in WebView - running in browser");
    }
  }, [response]);

  const renderStoreButton = () => {
    if (platform === "ios") {
      return (
        <a
          href="https://apps.apple.com/us/app/com.ShadowGPS.ios"
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded transition mt-4 block"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download on the App Store
        </a>
      );
    }
    if (platform === "android") {
      return (
        <a
          href="https://play.google.com/store/apps/details?id=com.ShadowGPS.android"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition mt-4 block"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get it on Google Play
        </a>
      );
    }
    return null;
  };

  const handleClose = () => {
    if (isWebView) {
      sendWebViewMessage({
        action: "close",
        manual: true,
      });
    } else {
      window.close();
    }
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
          {renderStoreButton()}
        </div>
      </div>
    );
  }

  const status = response.status || "error";
  const title =
    response.title ||
    (status === "success"
      ? "Payment Successful!"
      : status === "pending"
      ? "Processing Payment"
      : "Payment Failed");
  const message = response.message || "";
  const nextStep = response.nextStep || "";
  const deviceName = response.deviceName || "your device";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div
        className={`bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-3 ${
          status === "success"
            ? "border-green-500 bg-green-50"
            : status === "pending"
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
        {message && <p className="text-gray-700 mb-6">{message}</p>}

        {/* Device Name (for success) */}
        {status === "success" && (
          <p className="text-gray-700 mb-6">
            Your device <strong>{deviceName}</strong> is now ready to use!
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
        {nextStep && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              Next Steps
            </h3>
            <p className="text-gray-700">{nextStep}</p>
            {status === "failed" && response.supportEmail && (
              <p className="text-gray-700 mt-3">
                Need help? Contact us at{" "}
                <a
                  href={`mailto:${response.supportEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {response.supportEmail}
                </a>
              </p>
            )}
          </div>
        )}

        {/* Close/Return Button */}
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

        {/* App Store Buttons */}
        {!isWebView && renderStoreButton()}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
          &copy; {new Date().getFullYear()} ShadowGPS - All rights reserved
        </div>
      </div>
    </div>
  );
}
