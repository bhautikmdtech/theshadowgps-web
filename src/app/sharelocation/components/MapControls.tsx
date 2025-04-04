"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { FaLayerGroup, FaMapMarkerAlt, FaCarSide } from "react-icons/fa";
import { toast } from "react-toastify";

interface MapControlsProps {
  map: mapboxgl.Map;
  deviceLocation?: { lng: number; lat: number };
}

const MapControls = ({ map, deviceLocation }: MapControlsProps) => {
  const isSatellite = useRef(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const watchIdRef = useRef<number | null>(null);

  // Debug function to check map state
  const logMapState = () => {
    if (!map) {
      console.error("Map instance is null");
      return false;
    }
    if (!map.isStyleLoaded()) {
      console.warn("Map style not loaded yet");
      return false;
    }
    return true;
  };

  const moveToBrowserLocation = () => {
    if (!logMapState()) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    // Clear any existing watcher
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateDeviceMarker(longitude, latitude);
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true,
        });
      },
      (error) => toast.error(`Location error: ${error.message}`),
      { enableHighAccuracy: true }
    );
  };

  const updateDeviceMarker = (lng: number, lat: number) => {
    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const el = document.createElement("div");
    el.className = "device-marker";
    Object.assign(el.style, {
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      backgroundColor: "#4285F4",
      border: "2px solid white",
      boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
    });

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: "center",
    })
      .setLngLat([lng, lat])
      .addTo(map);

    markersRef.current.push(marker);
  };

  const handleLayerToggle = () => {
    if (!logMapState()) return;

    isSatellite.current = !isSatellite.current;
    const style = isSatellite.current
      ? "mapbox://styles/mapbox/satellite-streets-v11"
      : "mapbox://styles/mapbox/streets-v11";

    map.setStyle(style);

    // Re-add markers after style change
    map.once("style.load", () => {
      if (markersRef.current.length > 0) {
        const lastPos = markersRef.current[0].getLngLat();
        updateDeviceMarker(lastPos.lng, lastPos.lat);
      }
    });
  };

  const moveToDeviceLocation = () => {
    if (!logMapState()) return;

    if (!deviceLocation) {
      toast.error("Device location unavailable");
      return;
    }

    map.flyTo({
      center: [deviceLocation.lng, deviceLocation.lat],
      zoom: 14,
      essential: true,
    });
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      markersRef.current.forEach((marker) => marker.remove());
    };
  }, []);

  return (
    <div
      className="mapboxgl-ctrl mapboxgl-ctrl-group"
      style={{
        margin: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <button
        onClick={handleLayerToggle}
        className="map-control-btn"
        title="Toggle Map Layer"
      >
        <FaLayerGroup size={18} />
      </button>

      <button
        onClick={moveToDeviceLocation}
        className="map-control-btn"
        title="Move to Device Location"
      >
        <FaCarSide size={18} />
      </button>

      <button
        onClick={moveToBrowserLocation}
        className="map-control-btn"
        title="Move to My Location"
      >
        <FaMapMarkerAlt size={18} />
      </button>
    </div>
  );
};

// CSS for the controls (add to your global CSS)
/*
.map-control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: none;
  border-radius: 4px;
  box-shadow: 0 0 4px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-control-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 6px rgba(0,0,0,0.3);
}

.map-control-btn:active {
  transform: scale(0.98);
}
*/

export default MapControls;
