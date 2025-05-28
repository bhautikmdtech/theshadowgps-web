"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import MapComponent from "@/services/MapService";
import { createDeviceMarker, createStartMarker } from "./DeviceMarker";
// Import MapControls dynamically
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
  initialData: any;
}) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deviceLocationActive, setDeviceLocationActive] = useState(true);
  const [mobileLocationActive, setMobileLocationActive] = useState(false);

  const mapRef = useRef<mapboxgl.Map>(null);
  const deviceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const routeSourceId = "route-arrow";
  const routeLayerId = "route-arrow-line";

  // Initialize with device info and positions
  useEffect(() => {
    if (initialData?.deviceInfo && initialData?.latestPoint) {
      setDevice(initialData.deviceInfo);
      setPositions([initialData.latestPoint]);
    } else {
      setError("No initial location data available");
    }
  }, [initialData]);

  const handleUserInteraction = () => {
    setMobileLocationActive((prevActive) => {
      if (prevActive) {
        return false;
      }
      return prevActive;
    });
    setDeviceLocationActive((prevActive) => {
      if (prevActive) {
        return false;
      }
      return prevActive;
    });
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
      } catch (err) {
        // Source doesn't exist yet or was removed during style change
        source = null;
      }

      if (source) {
        // Update existing source
        source.setData(routeGeoJSON);
      } else {
        // Create new source and layer
        try {
          // First check if the layer exists, and remove it if it does
          if (map.getLayer(routeLayerId)) {
            map.removeLayer(routeLayerId);
          }
          // Check if source exists and remove it
          if (map.getSource(routeSourceId)) {
            map.removeSource(routeSourceId);
          }
        } catch (err) {
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

  const handleMapLoad = useCallback(
    (map: mapboxgl.Map) => {
      if (positions.length === 0) return;

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

      if (positions.length > 1) {
        updateRoute(positions);
      }

      // Center map on device location by default if device location tracking is active
      if (deviceLocationActive && latest) {
        map.flyTo({
          center: [latest.lng, latest.lat],
          zoom: 16,
          essential: true,
          duration: 500,
        });
      }

      // Attach event listeners to detect when user manually interacts with the map
      map.on("dragstart", handleUserInteraction);
      // map.on("zoomstart", handleUserInteraction);
      // map.on("rotatestart", handleUserInteraction);
      // map.on("pitchstart", handleUserInteraction);
      // Don't trigger on moveend as it fires after programmatic movements too
      
      // Add listener for style changes directly on the map
      map.on("style.load", () => {
        // This will run after any style change
        if (positions.length > 1) {
          setTimeout(() => updateRoute(positions), 100);
        }
      });

      // Force a rerender to update the MapControls component
      setPositions((prev) => [...prev]);
    },
    [positions, device, deviceLocationActive, updateRoute]
  );

  const handlePositionUpdate = useCallback(
    (newPosition: Position) => {
      setPositions((prev) => {
        const last = prev[prev.length - 1];
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

        // Only center the map if the device location tracking is active
        if (mapRef.current && deviceLocationActive && !mobileLocationActive) {
          mapRef.current.flyTo({
            center: [newPosition.lng, newPosition.lat],
            zoom: 16,
            speed: 0.8,
            curve: 1.2,
            duration: 1000,
            essential: true,
          });
        }

        return updated;
      });
    },
    [updateRoute, deviceLocationActive, mobileLocationActive]
  );

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
  }, [shareToken, handlePositionUpdate]);

  // Effect to update the map when device location tracking is toggled
  useEffect(() => {
    if (deviceLocationActive && mapRef.current && positions.length > 0) {
      const latest = positions[positions.length - 1];
      mapRef.current.flyTo({
        center: [latest.lng, latest.lat],
        zoom: 16,
        essential: true,
        duration: 500,
      });
    }
  }, [deviceLocationActive, positions]);

  // Function to recreate all markers after style changes
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

  // Effect to listen for map style changes and recreate the route and markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleStyleChange = () => {
      if (positions.length > 1) {
        // Wait for a moment to ensure the map is fully loaded
        setTimeout(() => {
          updateRoute(positions);
          recreateMarkers();
        }, 100);
      }
    };

    window.addEventListener("mapStyleChanged", handleStyleChange);

    return () => {
      window.removeEventListener("mapStyleChanged", handleStyleChange);
    };
  }, [mapRef, positions, updateRoute, recreateMarkers]);

  // Clean up markers when component unmounts
  useEffect(() => {
    return () => {
      if (deviceMarkerRef.current) {
        deviceMarkerRef.current.remove();
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
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
            />
            {/* MapControls will be dynamically loaded and will handle its own initialization */}
            <div className="fixed right-2 bottom-[100px] md:bottom-[10px] md:right-4 z-[999]">
              {positions.length > 0 && (
                <DynamicMapControls
                  map={mapRef.current}
                  deviceLocation={positions[positions.length - 1]}
                  deviceLocationActive={deviceLocationActive}
                  setDeviceLocationActive={setDeviceLocationActive}
                  mobileLocationActive={mobileLocationActive}
                  setMobileLocationActive={setMobileLocationActive}
                />
              )}
            </div>
            {/* Mobile Bottom Panel */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[24px] shadow-lg z-[9]">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
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
