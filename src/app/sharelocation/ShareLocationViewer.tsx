"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

import { Position, LocationPoints } from "@/types/location";
import { io } from "../../lib/socketClient";
import {
  FaMapMarkerAlt,
  FaLocationArrow,
  FaCrosshairs,
  FaSync,
  FaSatelliteDish,
  FaExclamationTriangle,
} from "react-icons/fa";
import { BiLoaderAlt } from "react-icons/bi";
import axiosClient from "@/lib/axiosClient";
import { LivePositionData } from "./MapComponent";

// Define interfaces for our data types
interface DeviceInfo {
  _id: string;
  deviceName: string;
  imageUrl?: string;
  shareTitle?: string;
  expiresAt?: string;
}

interface Socket {
  connected: boolean;
  disconnect: () => void;
  on: (event: string, callback: any) => void;
  off: (event: string, callback: any) => void;
  emit: (event: string, ...args: any[]) => void;
}

// Extend the LivePositionData with additional fields needed for this component
interface ExtendedLivePosition extends LivePositionData {
  deviceId?: string;
  _meta?: {
    viewers?: number;
  };
}

interface ShareConnectedStatus {
  connected: boolean;
  viewers?: number;
  deviceId?: string;
}

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-100 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#f8f9fa",
            backgroundImage:
              "linear-gradient(rgba(230, 230, 230, 0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(230, 230, 230, 0.7) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 loading-progress"></div>
      </div>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white py-3 px-5 rounded-lg shadow-md flex items-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-3"></div>
        <span className="text-gray-700">Loading map...</span>
      </div>

      <style jsx>{`
        .loading-progress {
          animation: loadingBar 2.5s ease-in-out infinite;
          transform-origin: left;
        }

        @keyframes loadingBar {
          0% {
            transform: scaleX(0);
          }
          50% {
            transform: scaleX(1);
          }
          100% {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  ),
});

type ShareLocationViewerProps = {
  shareToken: string;
  initialData?: {
    data: any;
  };
};

export default function ShareLocationViewer({
  shareToken,
  initialData,
}: ShareLocationViewerProps) {
  const [connected, setConnected] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const isMounted = useRef<boolean>(true);
  const socketRef = useRef<Socket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mapContainerRef = useRef<Element | null>(null);

  const [expiryTimeRemaining, setExpiryTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const convertPointsArrayToObjects = (
    pointsArray: LocationPoints
  ): Position[] => {
    if (!pointsArray || !Array.isArray(pointsArray)) return [];

    return pointsArray.map((point) => ({
      latitude: point[0],
      longitude: point[1],
      speed: point[2],
      timestamp: point[3],
      wialonSpeedLimit: point[4],
      direction: point[5],
      address: point[6],
    }));
  };

  // Initialize data from server-side props if available
  useEffect(() => {
    if (initialData?.data && !deviceInfo) {
      try {
        const data = initialData.data;

        setDeviceInfo({
          ...data.deviceInfo,
          shareTitle: data.shareTitle,
          expiresAt: data.expiresAt,
        });

        const locationPoints = data.points || [];
        const positionObjects = convertPointsArrayToObjects(locationPoints);
        setPositions(positionObjects);
        setConnected(true);
      } catch (err) {
        fetchLocationData(shareToken);
      }
    } else if (!deviceInfo) {
      fetchLocationData(shareToken);
    }
  }, [initialData, shareToken]);

  const fetchLocationData = useCallback(async (token: string) => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axiosClient.get(
        `/api/common/getSharedLocation/${token}`
      );
      const data = response.data;

      if (!data || !data.data) {
        throw new Error("Invalid data structure received");
      }

      setDeviceInfo({
        ...data.data.deviceInfo,
        shareTitle: data.data.shareTitle,
        expiresAt: data.data.expiresAt,
      });

      const locationPoints = data.data.points || [];
      const positionObjects = convertPointsArrayToObjects(locationPoints);
      setPositions(positionObjects);
      setConnected(true);
      setError(null);

      return data;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || "Failed to load location data"
          : "Failed to load location data";

      setError(errorMessage);
      setConnected(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle component mount/unmount
  useEffect(() => {
    isMounted.current = true;

    // Find and store map container reference
    mapContainerRef.current = document.querySelector(
      '[data-testid="map-container"]'
    );

    return () => {
      isMounted.current = false;

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  // Setup socket connection
  useEffect(() => {
    if (!shareToken) return;

    // Clean up previous socket if it exists
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket connection
    socketRef.current = io(
      process.env.NEXT_PUBLIC_API_URL || window.location.origin,
      {
        auth: { shareToken },
        transports: ["websocket", "polling"],
        path: "/share-socket",
      }
    );

    const socket = socketRef.current;

    // Socket event handlers
    const handleConnect = () => {
      if (isMounted.current) {
        setConnected(true);
        setError(null);
      }
    };

    const handleDisconnect = () => {
      if (isMounted.current) {
        setConnected(false);
      }
    };

    const handleConnectError = (err: Error) => {
      if (isMounted.current) {
        setConnected(false);
        setError(`Connection error: ${err.message}`);
      }
    };

    const handleShareConnected = (status: ShareConnectedStatus) => {
      if (isMounted.current) {
        setConnected(status.connected);
      }
    };

    const handlePositionUpdate = (newPosition: ExtendedLivePosition) => {
      if (!isMounted.current || positions.length === 0) return;

      const newPositionObj: Position = {
        latitude: newPosition.lat,
        longitude: newPosition.lng,
        speed: newPosition.speed,
        timestamp: newPosition.tm ?? Math.floor(Date.now() / 1000),
        direction: newPosition.direction,
        address: newPosition.address,
      };

      // Add the new position to the positions array
      setPositions((prevPositions) => [...prevPositions, newPositionObj]);

      // Find map container and dispatch event
      const mapContainer =
        mapContainerRef.current ||
        document.querySelector('[data-testid="map-container"]');

      if (mapContainer) {
        // Use custom event to trigger the map service
        const liveUpdateEvent = new CustomEvent("live-position-update", {
          detail: {
            prevPosition: positions[positions.length - 1],
            newPosition: newPositionObj,
          },
        });

        mapContainer.dispatchEvent(liveUpdateEvent);
      }
    };

    // Register event handlers
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("shareConnected", handleShareConnected);
    socket.on("sharedPositionUpdate", handlePositionUpdate);

    // Set up ping interval
    pingIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 30000);

    // Cleanup function
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("shareConnected", handleShareConnected);
      socket.off("sharedPositionUpdate", handlePositionUpdate);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      socket.disconnect();
    };
  }, [shareToken, positions.length, deviceInfo]);

  // Helper function to dispatch map events
  const dispatchMapEvent = useCallback((eventName: string, detail?: any) => {
    const mapContainer =
      mapContainerRef.current ||
      document.querySelector('[data-testid="map-container"]');

    if (mapContainer) {
      const event = new CustomEvent(eventName, { detail });
      mapContainer.dispatchEvent(event);
    }
  }, []);

  const handleRefreshData = () => {
    if (!shareToken) {
      setError("No share token available");
      return;
    }
    fetchLocationData(shareToken);
  };

  const handleViewStart = () => {
    dispatchMapEvent("focus-point", { index: 0, type: "start" });
  };

  const handleViewCurrent = () => {
    // Close any open popups
    const popups = document.querySelectorAll(".mapboxgl-popup");
    popups.forEach((popup) => popup.remove());

    // Focus on the current point
    dispatchMapEvent("focus-point", {
      index: positions.length - 1,
      type: "current",
    });
  };

  const handleViewAll = () => {
    dispatchMapEvent("fit-all-points");
  };

  useEffect(() => {
    if (!deviceInfo?.expiresAt) {
      setExpiryTimeRemaining(null);
      return;
    }

    const updateExpiryTime = () => {
      if (!deviceInfo.expiresAt) {
        setExpiryTimeRemaining(null);
        return;
      }

      const expiryDate = new Date(deviceInfo.expiresAt);
      const now = new Date();
      const diffMs = expiryDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setExpiryTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        return;
      }

      // Convert to hours, minutes and seconds format
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setExpiryTimeRemaining({ hours, minutes, seconds });
    };

    updateExpiryTime();
    const intervalId = setInterval(updateExpiryTime, 1000);

    return () => clearInterval(intervalId);
  }, [deviceInfo?.expiresAt, deviceInfo]);

  const formatExpiryDisplay = () => {
    if (!expiryTimeRemaining) return null;

    const { hours, minutes, seconds } = expiryTimeRemaining;

    if (hours > 0) {
      return `${hours}hr${hours !== 1 ? "s" : ""} ${minutes}min ${seconds}sec`;
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}sec`;
    } else {
      return `${seconds}sec`;
    }
  };

  const expiryDisplay = formatExpiryDisplay();

  // If share link is expired, show expired message
  if (isExpired) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-amber-500 mb-4 text-5xl flex justify-center">
            <FaExclamationTriangle className="w-16 h-16" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link Expired</h2>
          <p className="text-gray-600 mb-6">
            This shared location link has expired and is no longer available.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // If there's an error, show error message
  if (error && !loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 mb-4 text-5xl flex justify-center">
            <FaExclamationTriangle className="w-16 h-16" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Error Loading Location
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefreshData}
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed header - always visible at top */}
      <div className="bg-white shadow-sm z-10 py-2">
        <div className="container mx-auto px-2 flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
          {/* Left section: Device info */}
          <div className="flex items-center gap-2">
            {/* Device image/avatar */}
            <div className="relative">
              {deviceInfo?.imageUrl ? (
                <Image
                  src={deviceInfo.imageUrl}
                  alt={deviceInfo.deviceName || "Device"}
                  width={28}
                  height={28}
                  className="rounded-full object-cover border-2 border-white shadow-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : deviceInfo?.deviceName ? (
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-medium text-xs border-2 border-white shadow-sm">
                  {deviceInfo.deviceName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center border-2 border-white shadow-sm">
                  <FaMapMarkerAlt className="text-gray-600 h-3 w-3" />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <h6 className="text-sm font-medium text-gray-800 mb-0">
                {deviceInfo?.deviceName
                  ? deviceInfo.deviceName
                  : "Location Tracking"}
              </h6>
              <div className="flex items-center text-xs text-gray-600">
                <span
                  className={`mr-1 w-2 h-2 rounded-full border border-white ${
                    connected ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>{" "}
                <span>
                  {connected ? "Connected" : "Disconnected"} •{" "}
                  {positions.length} points
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Expiry and action buttons */}
          <div className="flex items-center gap-1">
            {expiryDisplay && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md mr-1">
                Expires in {expiryDisplay}
              </span>
            )}

            <button
              onClick={handleRefreshData}
              disabled={loading}
              title="Refresh"
              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-md disabled:bg-blue-300"
            >
              {loading ? (
                <BiLoaderAlt className="animate-spin h-4 w-4" />
              ) : (
                <FaSync className="h-4 w-4" />
              )}
            </button>

            {positions.length > 0 && (
              <>
                <button
                  onClick={handleViewStart}
                  title="View start location"
                  className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-md"
                >
                  <FaMapMarkerAlt className="h-4 w-4" />
                </button>

                <button
                  onClick={handleViewCurrent}
                  title="View current location"
                  className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-md"
                >
                  <FaLocationArrow className="h-4 w-4" />
                </button>

                <button
                  onClick={handleViewAll}
                  title="View all points"
                  className="bg-purple-500 hover:bg-purple-600 text-white p-1.5 rounded-md"
                >
                  <FaCrosshairs className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Map component */}
      <div className="flex-1 relative overflow-hidden">
        {positions.length === 0 && loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center">
              <BiLoaderAlt className="animate-spin h-10 w-10 text-blue-500 mb-4" />
              <p className="text-gray-700">Loading location data...</p>
            </div>
          </div>
        ) : (
          <MapComponent
            allPositions={positions}
            deviceName={deviceInfo?.deviceName || "Device"}
            deviceImage={deviceInfo?.imageUrl}
          />
        )}
      </div>
    </div>
  );
}
