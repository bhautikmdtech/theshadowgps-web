"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold text-red-600">
              Invite Not Found
            </h1>
            <p className="mt-2 text-gray-600">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-green-600">
              Invite Accepted!
            </h1>
            <p className="mt-2 text-gray-600">
              You now have access to the shared device.
            </p>

            <div className="mt-6 store-buttons">
              {platform === "ios" && (
                <a
                  href="https://apps.apple.com/us/app/com.ShadowGPS.ios"
                  className="bg-blue-500 text-white px-4 py-2 rounded block mt-2"
                >
                  Download on the App Store
                </a>
              )}
              {platform === "android" && (
                <a
                  href="https://play.google.com/store/apps/details?id=com.ShadowGPS.android"
                  className="bg-green-500 text-white px-4 py-2 rounded block mt-2"
                >
                  Get it on Google Play
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
