"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import axiosInstance from "@/utils/axios";
import { Position, LocationPoints } from "@/types/location";
import { io, Socket } from "socket.io-client";

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

export default function ShareLocation() {
  const searchParams = useSearchParams();
  const [shareToken, setShareToken] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPanel, setShowPanel] = useState<boolean>(false);
  const [livePosition, setLivePosition] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [viewerStats, setViewerStats] = useState<any>(null);
  const isMounted = useRef<boolean>(true);
  const pingIntervalRef = useRef<any>(null);

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
      const response = await axiosInstance.get(
        `/api/common/getSharedLocation/${token}`
      );

      let data = response.data;

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
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load location data");
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

    socketInstance.on("shareConnected", (status: any) => {
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

    socketInstance.on("sharedPositionUpdate", (newPosition: any) => {
      if (isMounted.current) {
        setLivePosition(newPosition);

        if (positions.length > 0) {
          const newPositionObj: Position = {
            latitude: newPosition.lat,
            longitude: newPosition.lng,
            speed: newPosition.speed,
            timestamp: newPosition.tm,
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
    });

    socketInstance.on("viewerStats", (stats: any) => {
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

    setSocket(socketInstance);

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [shareToken, positions]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [socket]);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");

    if (tokenFromUrl) {
      setShareToken(tokenFromUrl);
      fetchLocationData(tokenFromUrl);
    }
  }, [searchParams, fetchLocationData]);

  const handleViewLocation = () => {
    if (!shareToken) {
      setError("Please enter a share token");
      return;
    }

    fetchLocationData(shareToken);
    setShowPanel(!showPanel);
  };

  const latestPosition =
    positions.length > 0 ? positions[positions.length - 1] : null;

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
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50">
      <div className="absolute inset-0 z-0">
        <MapComponent
          allPositions={positions}
          deviceName={deviceInfo?.deviceName || ""}
          deviceImage={deviceInfo?.imageUrl || ""}
          livePosition={livePosition}
        />
      </div>

      {/* Header Panel */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-md shadow-lg transition-transform duration-300 ease-in-out ${
          showPanel ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              {deviceInfo?.imageUrl ? (
                <div className="relative">
                  <img
                    src={deviceInfo.imageUrl}
                    alt={deviceInfo.deviceName || "Device"}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      connected ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                </div>
              ) : deviceInfo?.deviceName ? (
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold border-2 border-white shadow-sm">
                    {deviceInfo.deviceName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      connected ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                </div>
              ) : null}
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {deviceInfo?.deviceName
                    ? deviceInfo.deviceName
                    : "Location Tracking"}
                </h1>
                {deviceInfo?.shareTitle && (
                  <p className="text-sm text-gray-500">
                    {deviceInfo.shareTitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                {showPanel ? (
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
            </button>
          </div>

          <div className="mb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={shareToken}
                onChange={(e) => setShareToken(e.target.value)}
                className="flex-grow px-4 py-2 text-sm border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter share token"
              />
              <button
                onClick={handleViewLocation}
                disabled={loading}
                className={`px-4 py-2 rounded-r-lg text-white text-sm font-medium ${
                  loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"
                } transition-colors duration-200`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Track"
                )}
              </button>
            </div>
            {error && (
              <div className="text-sm text-red-600 mt-1 px-1">{error}</div>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                connected
                  ? "bg-green-500"
                  : error
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {loading
                ? "Connecting..."
                : connected
                ? `Connected • ${positions.length} location${
                    positions.length !== 1 ? "s" : ""
                  }`
                : "Disconnected"}
            </span>
            {positions.length > 1 && (
              <div className="col-span-2 flex items-center justify-center gap-3 mt-2 mb-1">
                <button
                  onClick={() => {
                    const mapElement = document.querySelector(
                      "[data-testid='map-container']"
                    );
                    if (mapElement) {
                      mapElement.dispatchEvent(
                        new CustomEvent("focus-point", {
                          detail: { index: 0, type: "start" },
                        })
                      );
                    }
                    setShowPanel(!showPanel);
                  }}
                  className="flex items-center justify-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  View Start
                </button>

                <button
                  onClick={() => {
                    const mapElement = document.querySelector(
                      "[data-testid='map-container']"
                    );
                    if (mapElement) {
                      mapElement.dispatchEvent(
                        new CustomEvent("focus-point", {
                          detail: {
                            index: positions.length - 1,
                            type: "current",
                          },
                        })
                      );
                    }
                    setShowPanel(!showPanel);
                  }}
                  className="flex items-center justify-center px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium hover:bg-orange-200 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  View Current
                </button>

                <button
                  onClick={() => {
                    const mapElement = document.querySelector(
                      "[data-testid='map-container']"
                    );
                    if (mapElement) {
                      mapElement.dispatchEvent(
                        new CustomEvent("fit-all-points")
                      );
                    }
                    setShowPanel(!showPanel);
                  }}
                  className="flex items-center justify-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-300 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                  View All
                </button>
                {deviceInfo && latestPosition && (
                  <div>
                    <span className="text-gray-500 block text-xs">
                      Last Updated: {formatDate(latestPosition.timestamp)},
                      Speed:{" "}
                      {latestPosition?.speed
                        ? Math.round(latestPosition?.speed)
                        : 0}{" "}
                      km/h,
                    </span>
                  </div>
                )}
              </div>
            )}
            {expiresInMinutes !== null && (
              <span className="ml-auto text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                Expires in {expiresInMinutes} min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toggle button when panel is hidden */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute top-4 right-4 z-10 bg-white shadow-lg rounded-full p-3 text-gray-700 hover:bg-gray-50 transition-all duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
