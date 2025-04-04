"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapControls from "@/app/sharelocation/components/MapControls";

mapboxgl.accessToken =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

interface MapComponentProps {
  initialPosition: { lng: number; lat: number };
  onMapLoad?: (map: mapboxgl.Map) => void;
  onPositionChange?: (position: { lng: number; lat: number }) => void;
}

export default function MapComponent({
  initialPosition,
  onMapLoad,
  onPositionChange,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [initialPosition.lng, initialPosition.lat],
      zoom: 14,
      minZoom: 1,
      attributionControl: false,
      renderWorldCopies: true,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: true,
      scrollZoom: true,
    });

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
      if (onMapLoad) {
        onMapLoad(map);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, [initialPosition, onMapLoad]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />
      {mapReady && mapRef.current && (
        <div className="absolute bottom-4 right-4 z-10 bg-none">
          <MapControls map={mapRef.current} deviceLocation={initialPosition} />
        </div>
      )}
    </div>
  );
}
