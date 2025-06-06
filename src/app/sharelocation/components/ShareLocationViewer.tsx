"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import MapComponent from "@/services/MapService";
import { createDeviceMarker, createStartMarker } from "./DeviceMarker";

// Event name constants to avoid typos
const EVENT_TRACKING_MODE_CHANGED = "trackingModeChanged";
const EVENT_MAP_STYLE_CHANGED = "mapStyleChanged";

// Import components dynamically
const DynamicMapControls = dynamic(() => import("./MapControls"), {
  ssr: false,
  loading: () => null,
});

const ExpiryTimer = dynamic(() => import("./ExpiryTimer"), { ssr: false });

interface Position {
  lat: number;
  lng: number;
  speed?: number;
  direction?: number;
  tm?: number;
  address?: string;
}

interface DeviceInfo {
  id: string;
  deviceName: string;
  imageUrl?: string;
}

export default function LiveTracker({
  shareToken,
  initialData,
}: {
  shareToken: string;
  initialData: {
    deviceInfo?: DeviceInfo;
    latestPoint?: Position;
    expiresAt?: string;
  };
}) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<string>("device");
  const [isMapStable, setIsMapStable] = useState<boolean>(false);

  const mapRef = useRef<mapboxgl.Map>(null);
  const deviceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const routeSourceId = "route-arrow";
  const routeLayerId = "route-arrow-line";
  const watchIdRef = useRef<number | null>(null);
  const locationModeRef = useRef<string>(locationMode);

  // testing point adding using page up button
  // useEffect(() => {
  //   let lat = initialData.latestPoint?.lat || 0;
  //   let lng = initialData.latestPoint?.lng || 0;
  //   window.addEventListener("keydown", function (event) {
  //     if (event.key === "PageUp") {
  //       handlePositionUpdate({
  //         // address: "Middlecroft Rd 164, Elkton, MD 21921, USA",
  //         lat,
  //         lng,
  //         speed: 0,
  //         tm: 1749177370,
  //       });
  //     }
  //     lat = lat + (Math.random() - 0.5) / 3000;
  //     lng = lng + Math.random() / 1000;
  //   });
  // }, []);

  // Initialize with device info and positions
  useEffect(() => {
    if (initialData?.deviceInfo && initialData?.latestPoint) {
      setDevice(initialData.deviceInfo);
      setPositions([initialData.latestPoint]);
    } else {
      setError("No initial location data available");
    }
  }, [initialData]);

  // Update the ref whenever locationMode changes
  useEffect(() => {
    locationModeRef.current = locationMode;
  }, [locationMode]);

  // Function to handle user interaction with the map
  const handleUserInteraction = () => {
    if (locationMode === "mobile" && watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (locationMode === "mobile" || locationMode === "device") {
      setLocationMode("none");
    }
  };

  // Function to update the route on the map
  const updateRoute = useCallback((positions: Position[]) => {
    const map = mapRef.current;
    if (!map || positions.length < 2) return;

    const coordinates = positions.map(
      (p) => [p.lng, p.lat] as [number, number]
    );

    const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates,
      },
    };

    try {
      // Check if the source already exists
      let source: mapboxgl.GeoJSONSource | null = null;
      try {
        source = map.getSource(routeSourceId) as mapboxgl.GeoJSONSource;
      } catch {
        source = null;
      }

      if (source) {
        // Update existing source
        source.setData(routeGeoJSON);
      } else {
        // Create new source and layer
        try {
          // Remove existing layer and source if they exist
          if (map.getLayer(routeLayerId)) {
            map.removeLayer(routeLayerId);
          }
          if (map.getSource(routeSourceId)) {
            map.removeSource(routeSourceId);
          }
        } catch {
          // Layer or source doesn't exist, which is fine
        }

        // Add new source and layer
        map.addSource(routeSourceId, {
          type: "geojson",
          data: routeGeoJSON,
        });

        map.addLayer({
          id: routeLayerId,
          type: "line",
          source: routeSourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#4d6bfe",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });
      }
    } catch (error) {
      console.error("Error updating route:", error);
    }
  }, []);

  // Handle position updates from the socket
  function handlePositionUpdate(newPosition: Position) {
    setPositions((prev) => {
      const last = prev[prev.length - 1];
      // Skip if position hasn't changed
      if (last?.lat === newPosition.lat && last?.lng === newPosition.lng) {
        return prev;
      }

      const updated = [...prev, newPosition];

      // Update device marker position if it exists
      if (deviceMarkerRef.current) {
        deviceMarkerRef.current.setLngLat([newPosition.lng, newPosition.lat]);
      }

      // Update route with new positions
      updateRoute(updated);

      // Only center the map if device location tracking is active
      if (
        mapRef.current &&
        locationModeRef.current === "device" &&
        isMapStable
      ) {
        mapRef.current.easeTo({
          center: [newPosition.lng, newPosition.lat],
          curve: 1,
          zoom: 16,
          duration: 800,
          essential: true,
        });
      }

      return updated;
    });
  }

  // Handle map load and initialize markers
  const handleMapLoad = useCallback(
    (map: mapboxgl.Map) => {
      if (positions.length === 0) return;

      const latest = positions[positions.length - 1];

      // Create device marker
      deviceMarkerRef.current = createDeviceMarker({
        position: latest,
        device,
        mapRef,
        isMotion: positions.length > 1,
      });

      // Create start marker
      startMarkerRef.current = createStartMarker({
        position: positions[0],
        device,
        mapRef,
      });

      // Create route if multiple positions exist
      if (positions.length > 1) {
        updateRoute(positions);
      }

      // Center map on device location if tracking is active
      if (locationMode === "device" && latest && !isMapStable) {
        map.setCenter([latest.lng, latest.lat]);
        map.setZoom(16);
      }

      // Add event listener for user interaction
      map.on("dragstart", handleUserInteraction);

      // Add listener for style changes
      map.on("style.load", () => {
        if (positions.length > 1) {
          setTimeout(() => updateRoute(positions), 100);
        }
      });

      // Mark map as stable
      setIsMapStable(true);
    },
    [positions, device, locationMode, updateRoute]
  );

  // Connect to socket for location updates
  useEffect(() => {
    if (!shareToken) return;

    const socket = io(
      process.env.NEXT_PUBLIC_API_URL || window.location.origin,
      {
        auth: { shareToken },
        transports: ["websocket", "polling"],
        path: "/share-socket",
      }
    );

    socketRef.current = socket;
    socket.on("sharedPositionUpdate", handlePositionUpdate);

    return () => {
      socket.off("sharedPositionUpdate", handlePositionUpdate);
      socket.disconnect();
    };
  }, [shareToken]);

  // Listen for tracking mode changes
  useEffect(() => {
    const handleTrackingModeChange = (event: CustomEvent) => {
      const { mode } = event.detail;
      locationModeRef.current = mode;

      // If mode is 'device', ensure we're showing the device on the map
      if (mode === "device" && positions.length > 0) {
        const latest = positions[positions.length - 1];

        // Ensure the device marker is visible
        if (!deviceMarkerRef.current && mapRef.current) {
          deviceMarkerRef.current = createDeviceMarker({
            position: latest,
            device,
            mapRef,
            isMotion: positions.length > 1,
          });
        }

        // Center the map on the device
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [latest.lng, latest.lat],
            curve: 0.5,
            speed: 0.5,
            zoom: 16,
            duration: 1000,
            essential: true,
          });
        }
      }
    };

    window.addEventListener(
      EVENT_TRACKING_MODE_CHANGED,
      handleTrackingModeChange as EventListener
    );

    return () => {
      window.removeEventListener(
        EVENT_TRACKING_MODE_CHANGED,
        handleTrackingModeChange as EventListener
      );
    };
  }, [positions, device]);

  // Update map when location mode changes
  useEffect(() => {
    if (!mapRef.current || !isMapStable) return;

    locationModeRef.current = locationMode;

    // Only fly to device location if changing to device mode
    if (locationMode === "device" && positions.length > 0) {
      const latest = positions[positions.length - 1];
      mapRef.current.easeTo({
        center: [latest.lng, latest.lat],
        curve: 1,
        zoom: 16,
        duration: 800,
        essential: true,
      });
    }
  }, [positions, isMapStable]); // eslint-disable-line

  // Function to recreate markers after style changes
  const recreateMarkers = useCallback(() => {
    if (positions.length === 0 || !mapRef.current) return;

    // Remove existing markers
    if (deviceMarkerRef.current) {
      deviceMarkerRef.current.remove();
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
    }

    // Recreate markers
    const latest = positions[positions.length - 1];
    deviceMarkerRef.current = createDeviceMarker({
      position: latest,
      device,
      mapRef,
      isMotion: positions.length > 1,
    });

    startMarkerRef.current = createStartMarker({
      position: positions[0],
      device,
      mapRef,
    });
  }, [positions, device, mapRef]);

  // Handle map style changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleStyleChange = () => {
      map.once("style.load", () => {
        if (positions.length > 1) {
          updateRoute(positions);
        }
        recreateMarkers();
      });
    };

    // Listen for style change events
    window.addEventListener(EVENT_MAP_STYLE_CHANGED, handleStyleChange);
    map.on("style.load", () => {
      if (positions.length > 1) {
        updateRoute(positions);
      }
      recreateMarkers();
    });

    return () => {
      window.removeEventListener(EVENT_MAP_STYLE_CHANGED, handleStyleChange);
    };
  }, [mapRef, positions, updateRoute, recreateMarkers]);

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      if (deviceMarkerRef.current) {
        deviceMarkerRef.current.remove();
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="p-6 rounded-lg shadow-md text-center bg-white dark:bg-gray-800">
          <h2 className="text-xl font-bold mb-2">Tracking Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="shadow-sm py-2 px-3 flex justify-between items-center">
        <div className="hidden md:flex items-center gap-3">
          <Image
            src="/images/logoFull.svg"
            alt="ShadowGPS Logo"
            width={180}
            height={50}
          />

          {/* Divider with custom color */}
          <div
            className="h-8 mx-2"
            style={{ backgroundColor: "#337CFD", width: "2px" }}
          ></div>
          <div className="flex items-center gap-2">
            <Image
              src="/images/map/shopicon.svg"
              alt="ShadowGPS Logo"
              width={40}
              height={40}
            />
            <span
              className="text-sm font-medium cursor-pointer"
              style={{ color: currentTheme === "dark" ? "#60A5FA" : "#3B82F6" }}
            >
              Get your tracker now
            </span>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logoFull.svg"
              alt="ShadowGPS Logo"
              width={120}
              height={35}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Image
                src="/images/map/shopicon.svg"
                alt="Shop Icon"
                width={24}
                height={24}
              />
              <span className="text-sm text-blue-500">Get your tracker</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {device?.imageUrl ? (
            <Image
              src={device.imageUrl}
              alt="Device Image"
              width={40}
              height={40}
              className="rounded-full object-cover border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">
              {device?.deviceName?.charAt(0) || "D"}
            </div>
          )}

          <div className="hidden md:block">
            <h6
              className="font-medium m-0"
              style={{ color: currentTheme === "dark" ? "#E5E7EB" : "#0C1F3F" }}
            >
              {device?.deviceName || "My Tracker"}
            </h6>
          </div>

          <div className="hidden md:block">
            <ExpiryTimer
              expiresAt={initialData?.expiresAt || "2025-04-05T05:24:29.258Z"}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {positions.length > 0 ? (
          <>
            <MapComponent
              initialPosition={positions[positions.length - 1]}
              onMapLoad={handleMapLoad}
              mapRef={mapRef}
              zoom={16}
            />
            {/* Map Controls */}
            <div className="fixed right-3 bottom-[110px] md:bottom-[10px] md:right-4 z-[999]">
              {positions.length > 0 && (
                <DynamicMapControls
                  map={mapRef.current}
                  deviceLocation={positions[positions.length - 1]}
                  locationMode={locationMode}
                  setLocationMode={setLocationMode}
                  watchIdRef={watchIdRef}
                />
              )}
            </div>
            {/* Mobile Bottom Panel */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[24px] shadow-lg z-[9]">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  {device?.imageUrl ? (
                    <Image
                      src={device.imageUrl}
                      alt="Device"
                      width={40}
                      height={40}
                      className="rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">
                      {device?.deviceName?.charAt(0) || "T"}
                    </div>
                  )}
                  <div>
                    <h6 className="font-medium text-base m-0 text-gray-900 dark:text-gray-100">
                      {device?.deviceName || "My Tracker"}
                    </h6>
                  </div>
                </div>
                <div>
                  <ExpiryTimer
                    expiresAt={
                      initialData?.expiresAt || "2025-04-05T05:24:29.258Z"
                    }
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
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
          </div>
        )}
      </main>
    </div>
  );
}
