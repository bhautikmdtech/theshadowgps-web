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
}

const MapComponent = ({
  allPositions = [],
  deviceName = "",
  deviceImage = "",
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const positionsLoaded = useRef<boolean>(false);

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

          mapService.handleFocusPoint(index, type, allPositions);
        }
      }
    };

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

    container.addEventListener("focus-point", handleFocusPoint);
    container.addEventListener("fit-all-points", handleFitAllPoints);

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
