"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";

import { Position, LocationPoints } from "@/types/location";
import { io } from "../../lib/socketClient";
import {
  FaMapMarkerAlt,
  FaLocationArrow,
  FaCrosshairs,
  FaInfoCircle,
  FaSync,
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

// Extend the LivePositionData with additional fields needed for this component
interface ExtendedLivePosition extends LivePositionData {
  deviceId?: string;
  _meta?: {
    viewers?: number;
  };
}

interface ViewerStats {
  count: number;
  deviceId: string;
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

export default function ShareLocationViewer() {
  const searchParams = useSearchParams();
  const [shareToken, setShareToken] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [livePosition, setLivePosition] = useState<ExtendedLivePosition | null>(
    null
  );
  const [viewerStats, setViewerStats] = useState<ViewerStats | null>(null);
  const isMounted = useRef<boolean>(true);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const convertPointsArrayToObjects = (
    pointsArray: LocationPoints
  ): Position[] => {
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

  const fetchLocationData = useCallback(async (token: string) => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axiosClient.get(
        `/api/common/getSharedLocation/${token}`
      );
      const data = response.data;

      if (!data || !data.data) {
        console.error("Invalid data structure:", data);
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

      if (positionObjects.length > 0) {
        const lastPosition = positionObjects[positionObjects.length - 1];
        setLivePosition({
          lat: lastPosition.latitude,
          lng: lastPosition.longitude,
          speed: lastPosition.speed,
          tm: lastPosition.timestamp,
          direction: lastPosition.direction,
          address: lastPosition.address,
          deviceId: data.data.deviceInfo?._id || "",
        });
      }

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

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!shareToken) return;

    const socketInstance = io(
      process.env.NEXT_PUBLIC_API_URL || window.location.origin,
      {
        auth: { shareToken },
        transports: ["websocket", "polling"],
        path: "/share-socket",
      }
    );

    socketInstance.on("connect", () => {
      if (isMounted.current) {
        setConnected(true);
        setError(null);
      }
      console.log("Socket connected");
    });

    socketInstance.on("disconnect", (reason) => {
      if (isMounted.current) {
        setConnected(false);
      }
      console.log("Socket disconnected:", reason);
    });

    socketInstance.on("connect_error", (err) => {
      if (isMounted.current) {
        setConnected(false);
        setError(`Connection error: ${err.message}`);
      }
      console.error("Socket connection error:", err);
    });

    socketInstance.on("shareConnected", (status: ShareConnectedStatus) => {
      if (isMounted.current) {
        setConnected(status.connected);
        if (status.viewers) {
          setViewerStats({
            count: status.viewers,
            deviceId: status.deviceId || "",
          });
        }
      }
    });

    socketInstance.on(
      "sharedPositionUpdate",
      (newPosition: ExtendedLivePosition) => {
        if (isMounted.current) {
          setLivePosition(newPosition);

          if (positions.length > 0) {
            const newPositionObj: Position = {
              latitude: newPosition.lat,
              longitude: newPosition.lng,
              speed: newPosition.speed,
              timestamp: newPosition.tm ?? Math.floor(Date.now() / 1000),
              direction: newPosition.direction,
              address: newPosition.address,
            };

            // Update positions array with new position
            const updatedPositions = [...positions];
            updatedPositions[updatedPositions.length - 1] = newPositionObj;
            setPositions(updatedPositions);
          }

          if (newPosition._meta?.viewers) {
            setViewerStats({
              count: newPosition._meta.viewers,
              deviceId: newPosition.deviceId || "",
            });
          }
        }
      }
    );

    socketInstance.on("viewerStats", (stats: ViewerStats) => {
      if (isMounted.current) {
        setViewerStats(stats);
      }
    });

    socketInstance.on("pong", (data: { viewers: number }) => {
      if (isMounted.current && viewerStats) {
        setViewerStats({
          ...viewerStats,
          count: data.viewers,
        });
      }
    });

    pingIntervalRef.current = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit("ping");
      }
    }, 30000);

    return () => {
      clearInterval(pingIntervalRef.current as NodeJS.Timeout);
      socketInstance.disconnect();
    };
  }, [shareToken, positions]);

  // Get the URL parameter for the share token
  useEffect(() => {
    const token = searchParams.get("token") || "";
    if (token) {
      setShareToken(token);
      fetchLocationData(token);
    } else {
      setError("Missing share token. Please check the URL and try again.");
    }
  }, [searchParams, fetchLocationData]);

  const handleRefreshData = () => {
    if (!shareToken) {
      setError("No share token available");
      return;
    }
    fetchLocationData(shareToken);
  };

  const handleViewStart = () => {
    const mapContainer = document.querySelector(
      '[data-testid="map-container"]'
    );
    if (mapContainer) {
      const event = new CustomEvent("focus-point", {
        detail: { index: 0, type: "start" },
      });
      mapContainer.dispatchEvent(event);
    }
  };

  const handleViewCurrent = () => {
    const mapContainer = document.querySelector(
      '[data-testid="map-container"]'
    );

    if (mapContainer) {
      const popups = document.querySelectorAll(".mapboxgl-popup");
      popups.forEach((popup) => {
        popup.remove();
      });

      const event = new CustomEvent("focus-point", {
        detail: { index: positions.length - 1, type: "current" },
      });
      mapContainer.dispatchEvent(event);
    }
  };

  const handleViewAll = () => {
    const mapContainer = document.querySelector(
      '[data-testid="map-container"]'
    );
    if (mapContainer) {
      const event = new CustomEvent("fit-all-points");
      mapContainer.dispatchEvent(event);
    }
  };

  const calculateExpiryMinutes = () => {
    if (!deviceInfo?.expiresAt) return null;

    const expiryDate = new Date(deviceInfo.expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    return diffMins > 0 ? diffMins : 0;
  };

  const expiresInMinutes = calculateExpiryMinutes();

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed header - always visible at top */}
      <div className="bg-white shadow-sm z-10 py-2">
        <div className="container mx-auto px-2 flex flex-col md:flex-row gap-2 items-start md:items-center  justify-between">
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
                <span>Connected • {positions.length} points</span>
              </div>
            </div>
          </div>

          {/* Right section: Expiry and action buttons */}
          <div className="flex items-center gap-1">
            {expiresInMinutes !== null && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md mr-1">
                Expires in {expiresInMinutes}m
              </span>
            )}

            <button
              onClick={handleRefreshData}
              disabled={loading}
              title="Refresh"
              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-md"
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
        <MapComponent
          allPositions={positions}
          deviceName={deviceInfo?.deviceName || "Device"}
          deviceImage={deviceInfo?.imageUrl}
          livePosition={livePosition ?? undefined}
        />
      </div>
    </div>
  );
}
