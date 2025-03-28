"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Position } from "@/types/location";
import "mapbox-gl/dist/mapbox-gl.css";
import mapService from "@/services/MapService";

// Mapbox access token
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

// Set the access token for Mapbox
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
  livePosition?: LivePositionData;
}

const MapComponent = ({
  allPositions = [],
  deviceName = "",
  deviceImage = "",
  livePosition,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const positionsLoaded = useRef<boolean>(false);
  const livePositionRef = useRef<LivePositionData | null>(null);

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

  // Handle live position updates from socket
  useEffect(() => {
    if (!map.current || !mapContainer.current || !livePosition) return;

    // Skip if it's the same position we already processed
    if (
      livePositionRef.current &&
      livePosition.tm === livePositionRef.current.tm &&
      livePosition.lat === livePositionRef.current.lat &&
      livePosition.lng === livePositionRef.current.lng
    ) {
      return;
    }

    livePositionRef.current = livePosition;

    // Convert the live position to our Position format
    const positionObj: Position = {
      latitude: livePosition.lat,
      longitude: livePosition.lng,
      speed: livePosition.speed,
      timestamp: livePosition.tm ?? Math.floor(Date.now() / 1000),
      direction: livePosition.direction,
      address: livePosition.address,
    };

    // Update the last position in our all positions array
    if (allPositions.length > 0 && positionsLoaded.current) {
      // Create a copy of positions with the updated last position
      const updatedPositions = [...allPositions];
      updatedPositions[updatedPositions.length - 1] = positionObj;

      // Update just the current position marker
      mapService.updateCurrentPosition(positionObj, deviceName, deviceImage);
    }
  }, [livePosition, allPositions, deviceName, deviceImage]);

  // Set up event listeners for map navigation
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    // Focus on specific point
    const handleFocusPoint = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { index, type } = customEvent.detail || {};

      if (typeof index === "number" && allPositions.length > 0) {
        if (index >= 0 && index < allPositions.length) {
          // Make sure any open popups are closed first
          document.querySelectorAll(".mapboxgl-popup").forEach((popup) => {
            popup.remove();
          });

          // Call the map service to handle the focus
          mapService.handleFocusPoint(index, type, allPositions);
        }
      }
    };

    // Fit all points
    const handleFitAllPoints = () => {
      if (allPositions.length > 0) {
        document.querySelectorAll(".mapboxgl-popup").forEach((popup) => {
          popup.remove();
        });

        setTimeout(() => {
          mapService.fitMapToPositions(allPositions);
        }, 100);
      }
    };

    // Add event listeners
    container.addEventListener("focus-point", handleFocusPoint);
    container.addEventListener("fit-all-points", handleFitAllPoints);

    // Cleanup
    return () => {
      container.removeEventListener("focus-point", handleFocusPoint);
      container.removeEventListener("fit-all-points", handleFitAllPoints);
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
