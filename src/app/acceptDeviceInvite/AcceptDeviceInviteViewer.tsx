"use client";

import { useEffect, useState } from "react";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";

interface AcceptDeviceInviteViewerProps {
  response: {
    message?: string;
    userId?: string;
    email?: string;
    deviceId?: string;
    error?: string;
  };
}

export default function AcceptDeviceInviteViewer({
  response,
}: AcceptDeviceInviteViewerProps) {
  const { userId, deviceId, email, error } = response || {};
  const [platform, setPlatform] = useState<"ios" | "android" | "other">(
    "other"
  );

  useEffect(() => {
    if (userId && deviceId && email) {
      const appScheme = `shadowgps://inviteDevice?email=${email}&userId=${userId}&deviceId=${deviceId}`;
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);

      setPlatform(isIOS ? "ios" : isAndroid ? "android" : "other");

      setTimeout(() => {
        window.location.href = appScheme;
      }, 1000);
    }
  }, [userId, deviceId, email]);

  const renderStoreButton = () => {
    if (platform === "ios") {
      return (
        <a
          href="https://apps.apple.com/us/app/com.ShadowGPS.ios"
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded transition mt-4 block"
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
        >
          Get it on Google Play
        </a>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        {error ? (
          <div>
            <HiXCircle className="mx-auto text-red-500 w-12 h-12 mb-4" />
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Invite Not Found
            </h1>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : (
          <div>
            <HiCheckCircle className="mx-auto text-green-500 w-12 h-12 mb-4" />
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              Invite Accepted!
            </h1>
            <p className="text-gray-700">
              You now have access to the shared device.
            </p>
            {renderStoreButton()}
          </div>
        )}
      </div>
    </div>
  );
}
