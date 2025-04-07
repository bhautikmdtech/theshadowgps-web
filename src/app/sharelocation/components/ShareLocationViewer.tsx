"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import MapComponent from "@/services/MapService";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import { createDeviceMarker, createStartMarker } from "./DeviceMarker";
import dynamic from "next/dynamic";
import type { GeoJSON } from "geojson";

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
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const deviceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const routeSourceRef = useRef<string>("route-arrow");
  const routeLayerRef = useRef<string>("route-arrow-line");

  // Initialize with device info and positions
  useEffect(() => {
    if (initialData?.deviceInfo && initialData?.latestPoint) {
      setDevice(initialData.deviceInfo);
      setPositions([initialData.latestPoint]);
      setIsReady(true);
    } else {
      setError("No initial location data available.");
    }
  }, [initialData]);

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;

    // Only initialize markers and route if we haven't already
    if (positions.length > 0) {
      const latest = positions[positions.length - 1];

      // Create device marker if it doesn't exist
      deviceMarkerRef.current = createDeviceMarker({
        position: latest,
        device: device || undefined,
        mapRef,
      });

      // Create start marker if it doesn't exist
      startMarkerRef.current = createStartMarker({
        position: positions[0],
        device: device || undefined,
        mapRef,
      });

      // Update route if we have at least 2 positions
      if (positions.length > 1) {
        updateRoute(positions);
      }
    }

    setIsReady(true);
  };

  // Update route line
  const updateRoute = useCallback((positions: Position[]) => {
    const map = mapRef.current;
    if (!map || positions.length < 2) return;

    const coordinates = positions.map(
      (p) => [p.lng, p.lat] as [number, number]
    );

    // if (!map.isStyleLoaded()) {
    //   map.once("style.load", () => updateRoute(positions));
    //   return;
    // }

    const routeGeoJSON: GeoJSON = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates,
      },
    };

    try {
      const existingSource = map.getSource(
        routeSourceRef.current
      ) as mapboxgl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(routeGeoJSON);
      } else {
        map.addSource(routeSourceRef.current, {
          type: "geojson",
          data: routeGeoJSON,
        });

        if (!map.getLayer(routeLayerRef.current)) {
          map.addLayer({
            id: routeLayerRef.current,
            type: "line",
            source: routeSourceRef.current,
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
      }
    } catch (error) {
      console.error("Error updating route:", error);
    }
  }, []);

  const handlePositionUpdate = useCallback(
    (newPosition: Position) => {
      setPositions((prev) => {
        const last = prev[prev.length - 1];
        if (last?.lat === newPosition.lat && last?.lng === newPosition.lng) {
          return prev;
        }

        const updated = [...prev, newPosition];

        if (deviceMarkerRef.current) {
          deviceMarkerRef.current.setLngLat([newPosition.lng, newPosition.lat]);
        }

        updateRoute(updated);

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [newPosition.lng, newPosition.lat],
            zoom: 16,
            speed: 0.8,
            curve: 1.2,
            duration: 2000,
            essential: true,
          });
        }

        return updated;
      });
    },
    [updateRoute]
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

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm py-2 px-3 flex justify-between items-center">
        <div className="hidden md:flex items-center gap-3">
          <Image
            src="/images/logoFull.svg"
            alt="ShadowGPS Logo"
            width={180}
            height={50}
          />
          <span className="text-sm text-blue-500 font-medium cursor-pointer">
            Get your tracker now
          </span>
        </div>

        <div className="flex items-center gap-2">
          {device?.imageUrl ? (
            <Image
              src={device.imageUrl}
              alt="ShadowGPS Logo"
              width={40}
              height={40}
              className="rounded-full object-cover border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">
              {device?.deviceName?.charAt(0) || "D"}
            </div>
          )}

          <div>
            <h6 className="font-medium m-0">
              {device?.deviceName || "My Tracker"}
            </h6>
          </div>

          <ExpiryTimer
            expiresAt={initialData?.expiresAt || "2025-04-05T05:24:29.258Z"}
          />
        </div>
      </div>

      <div className="flex-1 relative">
        {isReady && positions.length > 0 ? (
          <MapComponent
            initialPosition={{
              lng: positions[positions.length - 1].lng,
              lat: positions[positions.length - 1].lat,
            }}
            onMapLoad={handleMapLoad}
            onPositionChange={() => {}}
          />
        ) : (
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
          </div>
        )}
      </div>
    </div>
  );
}
