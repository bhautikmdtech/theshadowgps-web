"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import MapComponent from "@/services/MapService";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import { createDeviceMarker, createStartMarker } from "./DeviceMarker";
import dynamic from "next/dynamic";

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

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const deviceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeLayerIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (initialData?.deviceInfo && initialData?.latestPoint) {
      setDevice(initialData.deviceInfo);
      setPositions([initialData.latestPoint]);
    } else {
      setError("No initial location data available.");
    }
  }, [initialData]);

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;
    setTimeout(() => {
      if (mapRef.current) {
        updateMap();
      }
    }, 100);
  };

  // Update map with current positions
  const updateMap = () => {
    if (!mapRef.current || positions.length === 0) return;

    const latestPosition = positions[positions.length - 1];

    // Remove the previous device marker
    if (deviceMarkerRef.current) {
      deviceMarkerRef.current.remove();
      deviceMarkerRef.current = null;
    }

    // Ensure the start marker is placed at the first position only once
    if (positions.length > 1 && !startMarkerRef.current) {
      startMarkerRef.current = createStartMarker({
        position: positions[0], // Ensure it's the first position
        device: device || undefined,
        mapRef,
      });
    }

    // Create and update the device marker at the latest position
    deviceMarkerRef.current = createDeviceMarker({
      position: latestPosition,
      device: device || undefined,
      mapRef,
    });

    // Update the route line
    setTimeout(() => updateRoute(positions), 100);

    // Fly to the new position smoothly
    mapRef.current.flyTo({
      center: [latestPosition.lng, latestPosition.lat],
      zoom: 14,
      essential: true,
    });
  };
  // Update route line
  const updateRoute = (positions: Position[]) => {
    if (!mapRef.current || positions.length < 2) return;

    const coordinates = positions.map(
      (p) => [p.lng, p.lat] as [number, number]
    );
    const routeId = "route-arrow";

    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once("style.load", () => updateRoute(positions));
      return;
    }

    // If route already exists, update it
    if (mapRef.current.getSource(routeId)) {
      (mapRef.current.getSource(routeId) as mapboxgl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      });
    } else {
      // Create new source
      mapRef.current.addSource(routeId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      });

      // Add line layer
      mapRef.current.addLayer({
        id: "route-arrow-line",
        type: "line",
        source: routeId,
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

      routeLayerIdRef.current = routeId;
    }
  };

  // Socket connection
  useEffect(() => {
    if (!shareToken) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(
      process.env.NEXT_PUBLIC_API_URL || window.location.origin,
      {
        auth: { shareToken },
        transports: ["websocket", "polling"],
        path: "/share-socket",
      }
    );

    socketRef.current = socket;

    // Socket event handlers
    const onConnect = () => {
      console.log("Socket Connected");
    };

    const onDisconnect = () => {
      console.log("Socket Disconnected");
    };

    const onPositionUpdate = (newPosition: Position) => {
      setPositions((prev) => {
        // Only add new position if it's different from the last one
        const lastPosition = prev[prev.length - 1];
        if (
          lastPosition &&
          lastPosition.lat === newPosition.lat &&
          lastPosition.lng === newPosition.lng
        ) {
          return prev;
        }
        return [...prev, newPosition];
      });
    };

    const onError = (err: Error) => {
      setError(`Connection error: ${err.message}`);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("sharedPositionUpdate", onPositionUpdate);
    socket.on("connect_error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sharedPositionUpdate", onPositionUpdate);
      socket.off("connect_error", onError);
      socket.disconnect();
    };
  }, [shareToken]);

  useEffect(() => {
    setTimeout(() => updateMap(), 100);
  }, [positions]);

  // Rest of your component remains the same...
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
        <div className="flex items-center gap-3">
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
        {positions.length > 0 && (
          <MapComponent
            initialPosition={{
              lng: positions[positions.length - 1].lng,
              lat: positions[positions.length - 1].lat,
            }}
            onMapLoad={handleMapLoad}
            onPositionChange={() => console.log("first")}
          />
        )}
      </div>
    </div>
  );
}
