"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { Position } from "@/types/location";
import "mapbox-gl/dist/mapbox-gl.css";
import mapService from "@/services/MapService";

// Mapbox access token
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

mapboxgl.accessToken = MAPBOX_TOKEN;

// Define a type for the live position data
export interface LivePositionData {
  tm?: number;
  lat: number;
  lng: number;
  speed?: number;
  direction?: number;
  address?: string;
}

interface MapComponentProps {
  allPositions?: Position[];
  deviceName?: string;
  deviceImage?: string;
  liveMode?: boolean;
}

const MapComponent = ({
  allPositions = [],
  deviceName = "",
  deviceImage = "",
  liveMode = false,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const positionsLoaded = useRef<boolean>(false);
  const [liveModeEnabled, setLiveModeEnabled] = useState<boolean>(liveMode);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = mapService.initializeMap(mapContainer.current);

    return () => {
      mapService.removeMap();
      map.current = null;
      positionsLoaded.current = false;
    };
  }, []);

  // Update positions on the map when they change
  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    if (allPositions.length > 0) {
      positionsLoaded.current = true;
      mapService.updatePositions(allPositions, deviceName, deviceImage);

      // Ensure that all points are visible when data initially loads
      if (map.current.loaded()) {
        setTimeout(() => {
          if (allPositions.length > 0) {
            mapService.fitMapToPositions(allPositions);
          }
        }, 1000);
      } else {
        map.current.once("load", () => {
          setTimeout(() => {
            if (allPositions.length > 0) {
              mapService.fitMapToPositions(allPositions);
            }
          }, 1000);
        });
      }
    }
  }, [allPositions, deviceName, deviceImage]);

  // Update the ref when the prop changes
  useEffect(() => {
    // Only update if the value actually changed
    if (liveModeEnabled !== liveMode) {
      console.log(`Live mode changed to: ${liveMode}`);
      setLiveModeEnabled(liveMode);

      // Update map service with new live mode status
      if (map.current && typeof mapService.setLiveModeEnabled === "function") {
        mapService.setLiveModeEnabled(liveMode);
      }

      // If enabling live mode and we have positions, focus on the latest position
      if (liveMode && allPositions.length > 0 && map.current) {
        const lastPosition = allPositions[allPositions.length - 1];

        // Calculate rotation angle if we have at least 2 positions
        if (allPositions.length > 1) {
          const prevPosition = allPositions[allPositions.length - 2];
          const bearing = mapService.getBearing(
            prevPosition.latitude,
            prevPosition.longitude,
            lastPosition.latitude,
            lastPosition.longitude
          );

          // Focus on the last position with rotation
          map.current.flyTo({
            center: [lastPosition.longitude, lastPosition.latitude],
            zoom: 18, // Closer zoom
            pitch: 55,
            bearing: bearing,
            duration: 1000,
          });
        } else {
          // Just focus without rotation if we only have one position
          map.current.flyTo({
            center: [lastPosition.longitude, lastPosition.latitude],
            zoom: 18,
            duration: 1000,
          });
        }
      }
    }
  }, [liveMode, allPositions, liveModeEnabled]);

  // Set up event listeners for map navigation
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const handleFocusPoint = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { index, type } = customEvent.detail || {};

      if (typeof index === "number" && allPositions.length > 0) {
        if (index >= 0 && index < allPositions.length) {
          document.querySelectorAll(".mapboxgl-popup").forEach((popup) => {
            popup.remove();
          });

          // Disable live mode when focusing on a specific point
          setLiveModeEnabled(false);

          mapService.handleFocusPoint(index, type, allPositions);
        }
      }
    };

    const handleFitAllPoints = () => {
      if (allPositions.length > 0) {
        document.querySelectorAll(".mapboxgl-popup").forEach((popup) => {
          popup.remove();
        });

        // Disable live mode when viewing all points
        setLiveModeEnabled(false);

        setTimeout(() => {
          mapService.fitMapToPositions(allPositions);
        }, 100);
      }
    };

    // Fixed handler for live position updates that properly handles the event
    const handleLivePositionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const {
        prevPosition,
        newPosition,
        deviceName,
        deviceImage,
        isLiveModeEnabled,
      } = customEvent.detail || {};

      if (prevPosition && newPosition) {
        // Update local state to match event state
        setLiveModeEnabled(!!isLiveModeEnabled);

        // Calculate bearing for proper rotation
        const bearing = mapService.getBearing(
          prevPosition.latitude,
          prevPosition.longitude,
          newPosition.latitude,
          newPosition.longitude
        );

        // Pass the live update to the map service
        if (map.current) {
          mapService.handleLiveUpdate(
            prevPosition,
            newPosition,
            deviceName || "",
            deviceImage || "",
            !!isLiveModeEnabled
          );
        }
      }
    };

    // Handle toggle live mode events
    const handleToggleLiveMode = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { enabled } = customEvent.detail || {};

      // Update local state
      setLiveModeEnabled(!!enabled);

      if (map.current) {
        // Focus on current position if enabling live mode
        if (enabled && allPositions.length > 0) {
          const lastPosition = allPositions[allPositions.length - 1];
          const secondLastIdx =
            allPositions.length > 1 ? allPositions.length - 2 : 0;
          const prevPosition = allPositions[secondLastIdx];

          // Calculate bearing for initial rotation
          const bearing = mapService.getBearing(
            prevPosition.latitude,
            prevPosition.longitude,
            lastPosition.latitude,
            lastPosition.longitude
          );

          // Fly to the current position with proper zoom
          map.current.flyTo({
            center: [lastPosition.longitude, lastPosition.latitude],
            zoom: 18, // Closer zoom
            pitch: 55,
            bearing: bearing,
            duration: 1000,
          });
        }
        // Reset view when disabling
        else if (!enabled) {
          map.current.easeTo({
            pitch: 0,
            bearing: 0,
            duration: 1000,
          });
        }
      }
    };

    container.addEventListener("focus-point", handleFocusPoint);
    container.addEventListener("fit-all-points", handleFitAllPoints);
    container.addEventListener(
      "live-position-update",
      handleLivePositionUpdate
    );
    container.addEventListener("toggle-live-mode", handleToggleLiveMode);

    return () => {
      container.removeEventListener("focus-point", handleFocusPoint);
      container.removeEventListener("fit-all-points", handleFitAllPoints);
      container.removeEventListener(
        "live-position-update",
        handleLivePositionUpdate
      );
      container.removeEventListener("toggle-live-mode", handleToggleLiveMode);
    };
  }, [allPositions, mapContainer]);

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100%" }}
      data-testid="map-container"
    />
  );
};

export default MapComponent;
