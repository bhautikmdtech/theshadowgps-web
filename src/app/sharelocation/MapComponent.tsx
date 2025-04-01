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
}

const MapComponent = ({
  allPositions = [],
  deviceName = "",
  deviceImage = "",
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const positionsLoaded = useRef<boolean>(false);

  // Initialize map on component mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = mapService.initializeMap(mapContainer.current);

    return () => {
      mapService.removeMap();
      map.current = null;
      positionsLoaded.current = false;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    if (allPositions.length > 0) {
      positionsLoaded.current = true;

      mapService.updatePositions(allPositions, deviceName, deviceImage);
    }
  }, [allPositions, deviceName, deviceImage]);

  // Set up event listeners for map interactions
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    // Event handler for focusing on a specific point
    const handleFocusPoint = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { index, type } = customEvent.detail || {};

      if (typeof index === "number" && allPositions.length > 0) {
        if (index >= 0 && index < allPositions.length) {
          document.querySelectorAll(".mapboxgl-popup").forEach((popup) => {
            popup.remove();
          });

          mapService.handleFocusPoint(index, type, allPositions);
        }
      }
    };

    // Event handler for fitting all points on the map
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

    // Event handler for live position updates
    const handleLivePositionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { prevPosition, newPosition } = customEvent.detail || {};

      if (prevPosition && newPosition) {
        if (map.current) {
          mapService.handleLiveUpdate(prevPosition, newPosition);
        }
      }
    };

    // Register event listeners
    container.addEventListener("focus-point", handleFocusPoint);
    container.addEventListener("fit-all-points", handleFitAllPoints);
    container.addEventListener(
      "live-position-update",
      handleLivePositionUpdate
    );

    // Clean up event listeners on unmount
    return () => {
      container.removeEventListener("focus-point", handleFocusPoint);
      container.removeEventListener("fit-all-points", handleFitAllPoints);
      container.removeEventListener(
        "live-position-update",
        handleLivePositionUpdate
      );
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
