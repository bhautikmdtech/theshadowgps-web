"use client";

import mapboxgl from "mapbox-gl";
import type { Position } from "@/types/location";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

mapboxgl.accessToken = MAPBOX_TOKEN;

let mapInstance: mapboxgl.Map | null = null;
let markers: mapboxgl.Marker[] = [];
let clickHandlerAdded = false;

const addStyles = (): void => {
  if (!document.getElementById("marker-animations")) {
    const style = document.createElement("style");
    style.id = "marker-animations";
    style.innerHTML = `
      @keyframes pulse {
        0% {
          opacity: 1;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(2.5);
        }
      }

      @keyframes float {
        0% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-6px);
        }
        100% {
          transform: translateY(0px);
        }
      }

      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-10px);
        }
        60% {
          transform: translateY(-5px);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .mapboxgl-popup {
        z-index: 3 !important;
      }

      .mapboxgl-popup-content {
        padding: 12px 10px 10px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.05);
      }

      .device-marker {
        animation: fadeIn 0.3s ease-out;
      }

      .marker-circle {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .pulse-ring {
        background: rgba(255, 165, 0, 0.2);
        border-radius: 50%;
        height: 100%;
        width: 100%;
        position: absolute;
        animation: pulse 2s infinite;
        opacity: 0;
      }
      
      .pulse-ring.active-live-mode {
        background: rgba(76, 175, 80, 0.3);
        animation: pulse 1.5s infinite;
      }

      .live-dot {
        animation: fadeIn 0.3s ease-out;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
      }

      .mapboxgl-ctrl button.mapboxgl-ctrl-custom {
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #fff;
        border: none;
        outline: none;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
        margin-bottom: 5px;
      }

      .mapboxgl-ctrl button.mapboxgl-ctrl-custom:hover {
        background-color: #f2f2f2;
      }

      .mapboxgl-ctrl button.mapboxgl-ctrl-custom:active {
        background-color: #e6e6e6;
      }
    `;
    document.head.appendChild(style);
  }
};

const addMapListeners = (): void => {
  if (!mapInstance) return;

  mapInstance.on("load", () => {
    if (mapInstance) {
      mapInstance.scrollZoom.enable();
    }
  });

  mapInstance.on("error", (e) => {
    // Silent error handling
  });

  mapInstance.on("zoomend", () => {
    if (markers.length > 0) {
      markers.forEach((marker) => {
        const currentLngLat = marker.getLngLat();
        marker.setLngLat([currentLngLat.lng, currentLngLat.lat]);
      });
    }
  });

  // Add event listener for showing device at last position
  mapInstance
    .getContainer()
    .addEventListener("show-device-at-last-position", (e: Event) => {
      const customEvent = e as CustomEvent;
      const { position, deviceName, deviceImage } = customEvent.detail || {};

      if (position) {
        mapService.showDeviceAtLastPosition(
          position,
          deviceName || "",
          deviceImage || ""
        );
      }
    });
};

type CustomControlPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const addCustomControl = ({
  title,
  className,
  icon,
  position,
  onClick,
}: {
  title: string;
  className: string;
  icon: string;
  position: CustomControlPosition;
  onClick: () => void;
}): void => {
  if (!mapInstance) return;

  class CustomControl implements mapboxgl.IControl {
    private container: HTMLDivElement;
    private map?: mapboxgl.Map;

    constructor(
      private title: string,
      private className: string,
      private icon: string,
      private clickHandler: () => void
    ) {
      this.container = document.createElement("div");
    }

    onAdd(map: mapboxgl.Map) {
      this.map = map;
      this.container.className = "mapboxgl-ctrl";
      this.container.innerHTML = `
        <button class="${this.className}" type="button" title="${this.title}" aria-label="${this.title}">
          ${this.icon}
        </button>
      `;

      // Add click handler
      const button = this.container.querySelector("button");
      if (button) {
        button.addEventListener("click", () => {
          this.clickHandler();
        });
      }

      return this.container;
    }

    onRemove() {
      this.container.parentNode?.removeChild(this.container);
      this.map = undefined;
    }
  }

  mapInstance.addControl(
    new CustomControl(title, className, icon, onClick),
    position
  );
};

const addCustomControls = (): void => {
  if (!mapInstance) return;

  addCustomControl({
    title: "Show current location",
    className: "mapboxgl-button",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`,
    position: "bottom-right",
    onClick: () => {
      if (markers.length > 0) {
        const currentMarker = markers[markers.length - 1];
        if (currentMarker) {
          const lngLat = currentMarker.getLngLat();
          mapInstance?.flyTo({
            center: [lngLat.lng, lngLat.lat],
            zoom: 15,
            duration: 1000,
          });

          if (currentMarker.getPopup()) {
            setTimeout(() => {
              markers.forEach((m) => {
                if (m !== currentMarker && m.getPopup()?.isOpen()) {
                  m.getPopup()?.remove();
                }
              });
              currentMarker.togglePopup();
            }, 1000);
          }
        }
      }
    },
  });

  addCustomControl({
    title: "Show entire trip",
    className: "mapboxgl-button",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`,
    position: "bottom-right",
    onClick: () => {
      if (markers.length > 0) {
        const positions: Position[] = markers.map((marker) => {
          const lngLat = marker.getLngLat();
          return {
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          } as Position;
        });

        mapService.fitMapToPositions(positions);

        markers.forEach((marker) => {
          if (marker.getPopup()?.isOpen()) {
            marker.getPopup()?.remove();
          }
        });
      }
    },
  });
};

const addControls = (): void => {
  if (!mapInstance) return;

  mapInstance.addControl(
    new mapboxgl.AttributionControl({
      compact: true,
    }),
    "bottom-left"
  );

  // Add navigation and other controls
  mapInstance.addControl(new mapboxgl.NavigationControl(), "bottom-right");
  mapInstance.addControl(new mapboxgl.FullscreenControl(), "bottom-right");
  mapInstance.addControl(new mapboxgl.ScaleControl(), "bottom-left");

  addCustomControls();
};

const addInitials = (
  el: HTMLElement,
  name: string,
  fontSize: string = "20px"
): void => {
  const initial = name ? name.charAt(0).toUpperCase() : "D";
  const text = document.createElement("span");
  text.textContent = initial;
  text.style.color = "white";
  text.style.fontSize = fontSize;
  text.style.fontWeight = "bold";
  text.style.lineHeight = "1";
  text.style.fontFamily = "Arial, sans-serif";
  text.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
  el.appendChild(text);
};

const createStartMarkerElement = (
  deviceName: string,
  deviceImage: string
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "device-start-marker-container";
  container.style.cursor = "pointer";

  const el = document.createElement("div");
  el.style.width = "34px";
  el.style.height = "34px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#4267B2";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  el.style.display = "flex";
  el.style.justifyContent = "center";
  el.style.alignItems = "center";
  el.style.transition =
    "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out";

  container.onmouseenter = () => {
    el.style.transform = "scale(1.1)";
    el.style.boxShadow = "0 3px 10px rgba(0,0,0,0.4)";
  };

  container.onmouseleave = () => {
    el.style.transform = "scale(1)";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  };

  container.appendChild(el);

  if (deviceImage) {
    const img = document.createElement("img");
    img.src = deviceImage;
    img.style.width = "85%";
    img.style.height = "85%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "50%";
    img.style.opacity = "0.85";
    img.onerror = () => {
      img.remove();
      addInitials(el, deviceName, "16px");
    };
    el.appendChild(img);
  } else {
    addInitials(el, deviceName, "16px");
  }

  return container;
};

const createLastMarkerElement = (
  deviceName: string,
  deviceImage: string
): HTMLElement => {
  // Create the main container for the marker
  const container = document.createElement("div");
  container.className = "device-marker";
  container.style.margin = "-8px";

  // Create the pulse ring (background animation)
  const pulseRing = document.createElement("div");
  pulseRing.className = "pulse-ring";

  // Create the main marker circle
  const markerCircle = document.createElement("div");
  markerCircle.className = "marker-circle";
  markerCircle.style.width = "36px";
  markerCircle.style.height = "36px";
  markerCircle.style.borderRadius = "50%";
  markerCircle.style.backgroundColor = "#FF9800";
  markerCircle.style.display = "flex";
  markerCircle.style.alignItems = "center";
  markerCircle.style.justifyContent = "center";
  markerCircle.style.border = "2px solid white";
  markerCircle.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
  markerCircle.style.position = "relative";
  markerCircle.style.zIndex = "1";
  markerCircle.style.transition =
    "transform 0.2s ease-out, box-shadow 0.2s ease-out";

  // Create a div for the live indicator dot (will be added/removed based on live mode)
  // This will be added dynamically when live mode is enabled

  // Add hover effects
  container.onmouseenter = () => {
    markerCircle.style.transform = "scale(1.1)";
    markerCircle.style.boxShadow = "0 3px 8px rgba(0, 0, 0, 0.3)";
  };

  container.onmouseleave = () => {
    markerCircle.style.transform = "scale(1)";
    markerCircle.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
  };

  // Add the image or text inside the marker circle
  if (deviceImage) {
    const img = document.createElement("img");
    img.src = deviceImage;
    img.alt = deviceName;
    img.style.width = "24px";
    img.style.height = "24px";
    img.style.borderRadius = "50%";
    img.style.objectFit = "cover";

    // Handle image load error
    img.onerror = () => {
      img.style.display = "none";

      // Create fallback with initials
      const initialsEl = document.createElement("div");
      initialsEl.style.width = "100%";
      initialsEl.style.height = "100%";
      initialsEl.style.borderRadius = "50%";
      initialsEl.style.backgroundColor = "#FF9800";
      initialsEl.style.display = "flex";
      initialsEl.style.alignItems = "center";
      initialsEl.style.justifyContent = "center";
      initialsEl.style.color = "white";
      initialsEl.style.fontWeight = "bold";
      initialsEl.style.fontSize = "14px";
      initialsEl.style.textTransform = "uppercase";
      initialsEl.innerText = deviceName.charAt(0) || "?";

      markerCircle.appendChild(initialsEl);
    };

    markerCircle.appendChild(img);
  } else {
    // If no image, show first initial of device name
    const initialsEl = document.createElement("div");
    initialsEl.style.width = "100%";
    initialsEl.style.height = "100%";
    initialsEl.style.borderRadius = "50%";
    initialsEl.style.display = "flex";
    initialsEl.style.alignItems = "center";
    initialsEl.style.justifyContent = "center";
    initialsEl.style.color = "white";
    initialsEl.style.fontWeight = "bold";
    initialsEl.style.fontSize = "14px";
    initialsEl.style.textTransform = "uppercase";
    initialsEl.innerText = deviceName.charAt(0) || "?";

    markerCircle.appendChild(initialsEl);
  }

  // Add marker components to container
  container.appendChild(pulseRing);
  container.appendChild(markerCircle);

  // Force a layout recalculation to ensure styles apply correctly
  setTimeout(() => {
    container.style.opacity = "1";
  }, 10);

  return container;
};

const createStartPopup = (
  position: Position,
  deviceName: string,
  deviceImage: string
): mapboxgl.Popup => {
  return new mapboxgl.Popup({
    offset: [0, -10],
    closeButton: true,
    closeOnClick: false,
    className: "custom-popup",
    maxWidth: "300px",
  }).setHTML(
    `<div style="padding: 10px;">
       <div style="display:flex;align-items:center;margin-bottom:8px;">
         ${
           deviceImage
             ? `<img src="${deviceImage}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;object-fit:cover;opacity:0.9;" 
             onerror="this.style.display='none'">`
             : `<div style="width:24px;height:24px;border-radius:50%;background-color:#4267B2;color:white;display:flex;justify-content:center;align-items:center;margin-right:8px;font-weight:bold;font-size:12px;">${
                 deviceName ? deviceName.charAt(0).toUpperCase() : "D"
               }</div>`
         }
         <p style="margin:0;font-weight:bold;color:#333;font-size:14px;">Starting Point</p>
       </div>
       <p style="margin:4px 0 0;font-size:12px;color:#666;">${
         position.address || "Unknown location"
       }</p>
       ${
         position.timestamp
           ? `<p style="margin:4px 0 0;font-size:11px;color:#888;">${new Date(
               position.timestamp * 1000
             ).toLocaleString()}</p>`
           : ""
       }
     </div>`
  );
};

const createEventMarkerElement = (): HTMLElement => {
  const container = document.createElement("div");
  container.className = "route-marker-container";
  container.style.cursor = "pointer";
  container.style.padding = "6px";

  const el = document.createElement("div");
  el.className = "event-marker";
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "rgba(56, 135, 190, 0.8)";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 1px 5px rgba(0,0,0,0.3)";
  el.style.transition =
    "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out";

  container.appendChild(el);

  // Add hover effects
  container.onmouseenter = () => {
    el.style.transform = "scale(1.2)";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
    el.style.backgroundColor = "rgba(56, 135, 190, 1)";
  };

  container.onmouseleave = () => {
    el.style.transform = "scale(1)";
    el.style.boxShadow = "0 1px 5px rgba(0,0,0,0.3)";
    el.style.backgroundColor = "rgba(56, 135, 190, 0.8)";
  };

  return container;
};

// Create a popup for route markers
const createRouteMarkerPopup = (
  position: Position,
  index: number
): mapboxgl.Popup => {
  // Format the timestamp to a readable date and time if available
  const formattedTime = position.timestamp
    ? new Date(position.timestamp * 1000).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";

  // Format the speed if available
  const speedInfo =
    position.speed !== undefined
      ? `<div style="display:flex;align-items:center;"><span style="font-weight:500;">Speed:</span> ${Math.round(
          position.speed
        )} km/h</div>`
      : "";

  // Format the direction if available
  const directionInfo =
    position.direction !== undefined
      ? `<div style="display:flex;align-items:center;"><span style="font-weight:500;">Direction:</span> ${Math.round(
          position.direction
        )}°</div>`
      : "";

  return new mapboxgl.Popup({
    offset: [0, -5],
    closeButton: true,
    closeOnClick: false,
    className: "custom-popup",
    maxWidth: "300px",
  }).setHTML(
    `<div style="padding: 12px;">
       <div style="display:flex;align-items:center;margin-bottom:10px;border-bottom: 1px solid #eee;padding-bottom:8px;">
         <div style="width:24px;height:24px;border-radius:50%;background-color:#3887BE;color:white;display:flex;justify-content:center;align-items:center;margin-right:10px;font-weight:bold;font-size:12px;">${index}</div>
         <div>
           <p style="margin:0;font-weight:bold;color:#333;font-size:14px;">Waypoint ${index}</p>
           ${
             formattedTime
               ? `<p style="margin:0;font-size:11px;color:#888;">${formattedTime}</p>`
               : ""
           }
         </div>
       </div>
       <p style="margin:4px 0 10px;font-size:13px;color:#444;">${
         position.address || "Location point"
       }</p>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#555;">
         <div><span style="font-weight:500;">Lat:</span> ${position.latitude.toFixed(
           6
         )}</div>
         <div><span style="font-weight:500;">Lng:</span> ${position.longitude.toFixed(
           6
         )}</div>
         ${speedInfo}
         ${directionInfo}
       </div>
     </div>`
  );
};

const processPositions = (
  positions: Position[],
  deviceName: string,
  deviceImage: string
): void => {
  if (!mapInstance || !positions.length) return;

  try {
    // Filter valid positions
    const validPositions = positions.filter((pos) =>
      mapService.isValidPosition(pos)
    );

    if (validPositions.length === 0) {
      return;
    }

    // Set up click handler if not done yet
    mapService.setupClickHandler();

    // Check if we already have markers
    if (markers.length > 0) {
      // Update existing markers with smooth animation
      updateMarkerPositions(validPositions);

      // Fit to all positions
      setTimeout(() => {
        mapService.fitMapToPositions(validPositions);
      }, 500);
    } else {
      // First time - clear any existing markers
      mapService.clearMarkers();

      // Add markers
      addAllMarkers(validPositions, deviceName, deviceImage);

      // Add route line
      mapService.addRouteLine(validPositions);

      // Always fit map to show all points on initial load
      setTimeout(() => {
        mapService.fitMapToPositions(validPositions);
      }, 500);
    }
  } catch (error) {
    // Silent error handling
  }
};

const updateMarkerPositions = (positions: Position[]): void => {
  if (!mapInstance || !positions.length || markers.length === 0) return;

  // Only update if we have both positions and existing markers
  const hasStartMarker = markers.length > 0;
  const hasCurrentMarker = markers.length > 1;

  // Get the start and current position
  const firstPosition = positions[0];
  const lastPosition = positions[positions.length - 1];

  // Update start marker position if we have it
  if (hasStartMarker && mapService.isValidPosition(firstPosition)) {
    const startMarker = markers[0];
    mapService.moveMarker(startMarker, [
      firstPosition.longitude,
      firstPosition.latitude,
    ]);

    // Update popup content
    const popup = startMarker.getPopup();
    if (popup) {
      // Store element data for identification
      if (!startMarker.getElement().hasAttribute("data-name")) {
        startMarker.getElement().setAttribute("data-name", "");
        startMarker.getElement().setAttribute("data-image", "");
      }

      // Create a new popup with updated content and settings
      const newPopup = createStartPopup(
        firstPosition,
        startMarker.getElement().getAttribute("data-name") || "",
        startMarker.getElement().getAttribute("data-image") || ""
      );

      // Apply new popup to marker
      startMarker.setPopup(newPopup);
    }
  }

  // Update current marker position if we have it
  if (hasCurrentMarker && mapService.isValidPosition(lastPosition)) {
    const currentMarker = markers[markers.length - 1];
    mapService.moveMarker(currentMarker, [
      lastPosition.longitude,
      lastPosition.latitude,
    ]);

    // Update popup content
    const popup = currentMarker.getPopup();
    if (popup) {
      // Store element data for identification
      if (!currentMarker.getElement().hasAttribute("data-name")) {
        currentMarker.getElement().setAttribute("data-name", "");
        currentMarker.getElement().setAttribute("data-image", "");
      }

      // Create a new popup with updated content and settings
      const newPopup = mapService.createCurrentPopup(
        lastPosition,
        currentMarker.getElement().getAttribute("data-name") || "",
        currentMarker.getElement().getAttribute("data-image") || ""
      );

      // Apply new popup to marker
      currentMarker.setPopup(newPopup);
    }
  }

  // Update route line if available
  if (mapInstance.getSource("route-arrow")) {
    mapService.addRouteLine(positions);
  }
};

const addAllMarkers = (
  positions: Position[],
  deviceName: string,
  deviceImage: string
): void => {
  if (!mapInstance || positions.length === 0) return;

  // Keep track of route markers separately
  const routeMarkers: mapboxgl.Marker[] = [];
  let waypointCounter = 1; // Counter for waypoint numbering

  // Process positions
  positions.forEach((pos, index) => {
    // Determine marker type
    const isFirst = index === 0;
    const isLast = index === positions.length - 1;

    // Create appropriate marker
    if (isFirst) {
      mapService.createStartMarker(pos, deviceName, deviceImage);
    } else if (isLast) {
      mapService.createCurrentMarker(pos, deviceName, deviceImage);
    } else if (
      positions.length <= 10 ||
      index % Math.ceil(positions.length / 10) === 0
    ) {
      // For route markers, track them separately
      const marker = mapService.createRouteMarker(pos, waypointCounter);
      waypointCounter++; // Increment waypoint counter

      if (marker) {
        routeMarkers.push(marker);

        // Initially hide route markers if zoomed out
        if (mapInstance && mapInstance.getZoom() < 12) {
          marker.getElement().style.display = "none";
        }
      }
    }
  });

  // Add zoom change handler to show/hide route markers
  if (mapInstance && routeMarkers.length > 0) {
    mapInstance.on("zoom", () => {
      const currentZoom = mapInstance?.getZoom() || 0;

      // Show/hide route markers based on zoom level
      routeMarkers.forEach((marker) => {
        marker.getElement().style.display =
          currentZoom >= 12 ? "block" : "none";
      });
    });
  }
};

const createArrowImage = (): void => {
  if (!mapInstance) return;

  // Create a canvas to draw the arrow
  const canvas = document.createElement("canvas");
  const size = 34;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw a triangular arrow
    ctx.beginPath();
    ctx.moveTo(size * 0.1, size * 0.3); // Left top
    ctx.lineTo(size * 0.9, size * 0.5); // Right middle
    ctx.lineTo(size * 0.1, size * 0.7); // Left bottom
    ctx.closePath();

    // Fill with red
    ctx.fillStyle = "#FF0000";
    ctx.fill();

    // Add white stroke
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add the image to the map
    mapInstance.addImage("arrow", {
      width: size,
      height: size,
      data: new Uint8Array(ctx.getImageData(0, 0, size, size).data),
    });
  }
};

const addEndArrow = (coordinates: number[][]): void => {
  if (!mapInstance || coordinates.length < 2) return;

  // Get the last two points to determine direction
  const lastPoint = coordinates[coordinates.length - 1];
  const secondLastPoint = coordinates[coordinates.length - 2];

  // Calculate bearing
  const bearing = mapService.getBearing(
    secondLastPoint[1],
    secondLastPoint[0],
    lastPoint[1],
    lastPoint[0]
  );

  // Add end arrow source if it doesn't exist
  if (!mapInstance.getSource("end-arrow")) {
    mapInstance.addSource("end-arrow", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { bearing },
        geometry: {
          type: "Point",
          coordinates: lastPoint,
        },
      },
    });

    // Add end arrow layer
    mapInstance.addLayer({
      id: "end-arrow-layer",
      type: "symbol",
      source: "end-arrow",
      layout: {
        "icon-image": "arrow",
        "icon-size": 0.8,
        "icon-rotate": ["get", "bearing"],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  } else {
    // Update existing source
    const source = mapInstance.getSource("end-arrow") as mapboxgl.GeoJSONSource;
    source.setData({
      type: "Feature",
      properties: { bearing },
      geometry: {
        type: "Point",
        coordinates: lastPoint,
      },
    });
  }
};

const handleLivePositionUpdate = (
  prevPosition: Position,
  newPosition: Position
): void => {
  if (
    !mapInstance ||
    !mapService.isValidPosition(prevPosition) ||
    !mapService.isValidPosition(newPosition)
  )
    return;

  try {
    // Calculate bearing between previous and new position
    const bearing = mapService.getBearing(
      prevPosition.latitude,
      prevPosition.longitude,
      newPosition.latitude,
      newPosition.longitude
    );

    // Get the current marker
    const currentMarker =
      markers.length > 1 ? markers[markers.length - 1] : null;
    if (!currentMarker) return;

    // Update markers array
    markers[markers.length - 1] = currentMarker;

    // Calculate zoom level based on speed
    let targetZoom = 16; // Default zoom level
    if (newPosition.speed) {
      if (newPosition.speed > 80) targetZoom = 14;
      else if (newPosition.speed > 50) targetZoom = 15;
      else if (newPosition.speed > 30) targetZoom = 16;
      else targetZoom = 17;
    }

    // Get current map zoom
    const currentZoom = mapInstance.getZoom();

    // If this is one of the first position updates or current zoom is too far out,
    // zoom in more dramatically
    if (currentZoom < 12) {
      targetZoom = Math.max(targetZoom, 15);
    }

    // Ensure mapInstance still exists
    if (!mapInstance) return;

    // Hide the current marker temporarily
    currentMarker.getElement().style.display = "none";

    // Create a new marker at the new position
    const newMarkerEl = createLastMarkerElement(
      currentMarker.getElement().getAttribute("data-name") || "",
      currentMarker.getElement().getAttribute("data-image") || ""
    );

    const newCurrentMarker = new mapboxgl.Marker({
      element: newMarkerEl,
      anchor: "center",
      pitchAlignment: "map",
      rotationAlignment: "viewport",
    })
      .setLngLat([newPosition.longitude, newPosition.latitude])
      .addTo(mapInstance);

    // Update map view with smooth transition
    mapInstance.easeTo({
      center: [newPosition.longitude, newPosition.latitude],
      zoom: targetZoom,
      bearing: bearing,
      pitch: 55,
      duration: 1000,
      easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    });

    // After animation completes
    setTimeout(() => {
      if (!mapInstance) return;

      // Remove old marker and update markers array
      currentMarker.remove();
      markers[markers.length - 1] = newCurrentMarker;

      // Update route line
      const validPositions = markers.map((marker) => {
        const lngLat = marker.getLngLat();
        return {
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        } as Position;
      });

      validPositions.push(newPosition);
      mapService.addRouteLine(validPositions);
    }, 1000);
  } catch (error) {
    console.error("Error updating live position:", error);
  }
};

const mapService = {
  initializeMap: (container: HTMLElement): mapboxgl.Map => {
    addStyles();

    mapInstance = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0],
      zoom: 2,
      minZoom: 1,
      attributionControl: false,
      renderWorldCopies: true,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: true,
      scrollZoom: false,
    });

    container.setAttribute("data-testid", "map-container");

    // Add controls
    addControls();

    // Add listeners
    addMapListeners();

    return mapInstance;
  },
  removeMap: (): void => {
    if (mapInstance) {
      mapService.clearMarkers();
      mapInstance.remove();
      mapInstance = null;
      clickHandlerAdded = false;
    }
  },

  moveMarker: (
    marker: mapboxgl.Marker,
    newPosition: [number, number],
    duration: number = 1500
  ): void => {
    if (!marker) return;

    const oldLngLat = marker.getLngLat();
    const oldPosition: [number, number] = [oldLngLat.lng, oldLngLat.lat];
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeInOut = (t: number) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      };

      const easedProgress = easeInOut(progress);

      const lng =
        oldPosition[0] + (newPosition[0] - oldPosition[0]) * easedProgress;
      const lat =
        oldPosition[1] + (newPosition[1] - oldPosition[1]) * easedProgress;

      marker.setLngLat([lng, lat]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    // Start animation
    requestAnimationFrame(animate);
  },

  createCurrentPopup: (
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Popup => {
    return new mapboxgl.Popup({
      offset: [0, -10],
      closeButton: true,
      closeOnClick: false,
      maxWidth: "300px",
      className: "custom-popup",
    }).setHTML(
      `<div style="padding: 10px;">
       <div style="display:flex;align-items:center;margin-bottom:8px;">
         ${
           deviceImage
             ? `<img src="${deviceImage}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;object-fit:cover;" 
             onerror="this.style.display='none'">`
             : `<div style="width:24px;height:24px;border-radius:50%;background-color:#FF5722;color:white;display:flex;justify-content:center;align-items:center;margin-right:8px;font-weight:bold;">${
                 deviceName ? deviceName.charAt(0).toUpperCase() : "D"
               }</div>`
         }
         <div>
           <p style="margin:0;font-weight:bold;color:#333;font-size:14px;">${
             deviceName || "Current Location"
           }</p>
           <span style="display:flex;align-items:center;font-size:10px;color:#4CAF50;margin-top:2px;">
             <span style="display:inline-block;width:6px;height:6px;background-color:#4CAF50;border-radius:50%;margin-right:4px;"></span>
             Live Location
           </span>
         </div>
       </div>
       <p style="margin:0;font-size:12px;color:#444;border-bottom:1px solid #eee;padding-bottom:6px;">${
         position.address || "Unknown location"
       }</p>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;font-size:11px;color:#666;">
         ${
           position.timestamp
             ? `<div>Time: ${new Date(
                 position.timestamp * 1000
               ).toLocaleString()}</div>`
             : ""
         }
         ${
           position.speed
             ? `<div>Speed: ${Math.round(position.speed)} km/h</div>`
             : ""
         }
         <div>Lat: ${position.latitude.toFixed(6)}</div>
         <div>Lng: ${position.longitude.toFixed(6)}</div>
       </div>
     </div>`
    );
  },
  isValidPosition: (position: Position): boolean => {
    if (
      !position ||
      typeof position.latitude !== "number" ||
      typeof position.longitude !== "number"
    ) {
      return false;
    }

    if (
      !isFinite(position.latitude) ||
      !isFinite(position.longitude) ||
      (Math.abs(position.latitude) < 0.000001 &&
        Math.abs(position.longitude) < 0.000001)
    ) {
      return false;
    }

    if (
      Math.abs(position.latitude) > 90 ||
      Math.abs(position.longitude) > 180
    ) {
      return false;
    }

    return true;
  },
  getBearing: (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360;
  },
  fitMapToPositions: (positions: Position[]): void => {
    if (!mapInstance || positions.length === 0) return;

    try {
      const bounds = new mapboxgl.LngLatBounds();
      let validPointsAdded = 0;

      // Extend bounds with valid positions
      positions.forEach((pos) => {
        if (mapService.isValidPosition(pos)) {
          bounds.extend([pos.longitude, pos.latitude]);
          validPointsAdded++;
        }
      });

      if (validPointsAdded === 0) {
        return;
      }

      // Fit map to bounds with padding
      mapInstance.fitBounds(bounds, {
        padding: { top: 20, bottom: 20, left: 20, right: 20 },
        maxZoom: 15,
        duration: 1000,
      });
    } catch (error) {
      // Fallback to last position
      if (positions.length > 0) {
        mapService.centerMapOnPosition(positions[positions.length - 1]);
      }
    }
  },
  centerMapOnPosition: (position: Position, zoom: number = 14): void => {
    if (!mapInstance || !mapService.isValidPosition(position)) return;

    try {
      mapInstance.flyTo({
        center: [position.longitude, position.latitude],
        zoom,
        essential: true,
        duration: 1000,
      });

      // Show popup for the position
      setTimeout(() => {
        const marker = markers.find((m) => {
          const lngLat = m.getLngLat();
          return (
            lngLat.lat === position.latitude &&
            lngLat.lng === position.longitude
          );
        });

        if (marker && marker.getPopup()) {
          marker.togglePopup();
        }
      }, 1200);
    } catch (error) {
      // Silent error handling
    }
  },
  setupClickHandler: (): void => {
    if (!mapInstance || clickHandlerAdded) return;

    // For closing popups when clicking outside markers
    mapInstance.on("click", (e) => {
      // Check if the click target is a marker or popup
      const element = e.originalEvent.target as HTMLElement;
      const isMarkerClick = element.closest(".mapboxgl-marker") !== null;
      const isPopupClick = element.closest(".mapboxgl-popup") !== null;

      // Only close popups if clicking outside markers and popups
      if (!isMarkerClick && !isPopupClick) {
        // Close all popups
        markers.forEach((marker) => {
          const popup = marker.getPopup();
          if (popup?.isOpen()) {
            popup.remove();
          }
        });
      }
    });

    clickHandlerAdded = true;
  },
  clearMarkers: (): void => {
    markers.forEach((marker) => marker.remove());
    markers = [];
  },
  createStartMarker: (
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Marker | null => {
    if (!mapInstance || !mapService.isValidPosition(position)) return null;

    const markerElement = createStartMarkerElement(deviceName, deviceImage);
    const popup = createStartPopup(position, deviceName, deviceImage);

    try {
      // Store device name and image as data attributes for later use
      markerElement.setAttribute("data-name", deviceName);
      markerElement.setAttribute("data-image", deviceImage || "");
      markerElement.setAttribute("data-marker-type", "start");

      // Create marker with correct settings
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "center", // Change from "center" to "bottom" to fix position
        draggable: false,
        pitchAlignment: "map", // Change from "viewport" to "map" for better stability
        rotationAlignment: "viewport",
      });

      // Set position precisely
      marker.setLngLat([position.longitude, position.latitude]);

      // Add popup but don't open by default
      marker.setPopup(popup);

      // Add clickable behavior to the marker element
      markerElement.onclick = (e: MouseEvent) => {
        e.stopPropagation(); // Prevent map click from triggering

        // Close other popups first
        markers.forEach((m) => {
          if (m !== marker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup immediately
        if (marker.getPopup()?.isOpen()) {
          marker.getPopup()?.remove();
        } else {
          marker.togglePopup();
        }

        // Then center on this marker
        setTimeout(() => {
          if (mapInstance) {
            // Center on this marker after showing popup
            mapInstance.flyTo({
              center: [position.longitude, position.latitude],
              zoom: 15,
              duration: 1000,
            });
          }
        }, 200);
      };

      // Add to map
      marker.addTo(mapInstance);
      markers.push(marker);

      // Force marker to maintain its position on zoom events
      mapInstance.on("zoom", () => {
        // This helps ensure the marker stays exactly at its position
        marker.setLngLat([position.longitude, position.latitude]);
      });

      return marker;
    } catch (error) {
      // Silent error handling
      return null;
    }
  },
  createCurrentMarker: (
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Marker | null => {
    if (!mapInstance || !mapService.isValidPosition(position)) return null;

    const markerElement = createLastMarkerElement(deviceName, deviceImage);
    const popup = mapService.createCurrentPopup(
      position,
      deviceName,
      deviceImage
    );

    try {
      // Store device name and image as data attributes for later use
      markerElement.setAttribute("data-name", deviceName);
      markerElement.setAttribute("data-image", deviceImage || "");
      markerElement.setAttribute("data-marker-type", "current");

      // Create marker with correct settings
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "center", // Change from "center" to "bottom" for better positioning
        draggable: false,
        pitchAlignment: "map", // Use map alignment for better stability during zoom
        rotationAlignment: "viewport",
      });

      // Set position precisely
      marker.setLngLat([position.longitude, position.latitude]);

      // Add popup
      marker.setPopup(popup);

      // Add clickable behavior to the marker element
      markerElement.onclick = (e: MouseEvent) => {
        e.stopPropagation(); // Prevent map click from triggering

        // Close other popups first
        markers.forEach((m) => {
          if (m !== marker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup immediately
        if (marker.getPopup()?.isOpen()) {
          marker.getPopup()?.remove();
        } else {
          marker.togglePopup();
        }

        // Then center on this marker
        setTimeout(() => {
          if (mapInstance) {
            // Center on this marker
            mapInstance.flyTo({
              center: [position.longitude, position.latitude],
              zoom: 15,
              duration: 1000,
            });
          }
        }, 200);
      };

      // Add to map
      marker.addTo(mapInstance);
      markers.push(marker);

      // Force marker to maintain its position on zoom events
      mapInstance.on("zoom", () => {
        // This helps ensure the marker stays exactly at its position
        marker.setLngLat([position.longitude, position.latitude]);
      });

      return marker;
    } catch (error) {
      // Silent error handling
      return null;
    }
  },
  createRouteMarker: (
    position: Position,
    index: number = 0
  ): mapboxgl.Marker | null => {
    if (!mapInstance || !mapService.isValidPosition(position)) return null;

    const markerElement = createEventMarkerElement();
    const popup = createRouteMarkerPopup(position, index);

    try {
      // Create marker with correct settings
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "center",
        draggable: false,
      });

      // Set position
      marker.setLngLat([position.longitude, position.latitude]);

      // Add popup
      marker.setPopup(popup);

      // Add clickable behavior to the marker element
      markerElement.onclick = (e: MouseEvent) => {
        e.stopPropagation(); // Prevent map click from triggering

        // Close other popups first
        markers.forEach((m) => {
          if (m !== marker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup
        if (marker.getPopup()?.isOpen()) {
          marker.getPopup()?.remove();
        } else {
          marker.togglePopup();
        }

        // Center on this marker
        setTimeout(() => {
          if (mapInstance) {
            mapInstance.flyTo({
              center: [position.longitude, position.latitude],
              zoom: 16,
              duration: 800,
            });
          }
        }, 100);
      };

      // Add to map
      marker.addTo(mapInstance);
      markers.push(marker);

      return marker;
    } catch (error) {
      // Silent error handling
      return null;
    }
  },
  handleFocusPoint: (
    index: number,
    type: string,
    positions: Position[]
  ): void => {
    if (!mapInstance || positions.length === 0) {
      return;
    }

    if (index < 0 || index >= positions.length) {
      return;
    }

    const position = positions[index];

    const zoom = type === "current" ? 16 : 15;

    let marker = null;
    if (index < markers.length) {
      marker = markers[index];
    }

    // First close any open popups
    markers.forEach((m) => {
      if (m.getPopup()?.isOpen()) {
        m.getPopup()?.remove();
      }
    });

    // Center on position and ensure the marker is visible
    mapInstance.flyTo({
      center: [position.longitude, position.latitude],
      zoom: zoom,
      duration: 1000,
      essential: true,
    });

    if (marker && marker.getPopup()) {
      setTimeout(() => {
        if (!marker.getPopup()?.isOpen()) {
          marker.togglePopup();
        }
      }, 1000);
    }
  },
  updatePositions: (
    positions: Position[],
    deviceName: string,
    deviceImage: string
  ): void => {
    if (!mapInstance) return;

    // Process positions
    if (!mapInstance.loaded()) {
      mapInstance.once("load", () => {
        setTimeout(
          () => processPositions(positions, deviceName, deviceImage),
          100
        );
      });
    } else {
      setTimeout(
        () => processPositions(positions, deviceName, deviceImage),
        100
      );
    }
  },
  addRouteLine: (positions: Position[]): void => {
    if (!mapInstance || positions.length < 2) return;

    try {
      // Filter valid positions
      const validPositions = positions.filter((pos) =>
        mapService.isValidPosition(pos)
      );

      if (validPositions.length < 2) {
        return;
      }

      const coordinates = validPositions.map((pos) => [
        pos.longitude,
        pos.latitude,
      ]);

      // Create a custom arrow image if it doesn't exist
      if (!mapInstance.hasImage("arrow")) {
        createArrowImage();
      }

      // Add arrow layer if it doesn't exist
      if (!mapInstance.getSource("route-arrow")) {
        // Add source for the arrow line
        mapInstance.addSource("route-arrow", {
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

        // Add a green line layer
        mapInstance.addLayer({
          id: "route-arrow-line",
          type: "line",
          source: "route-arrow",
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

        // Add arrow symbols along the line
        mapInstance.addLayer({
          id: "route-arrow-symbol",
          type: "symbol",
          source: "route-arrow",
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 120, // Space between arrows
            "icon-image": "arrow",
            "icon-size": 0.7,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-rotation-alignment": "map",
          },
        });
      } else {
        // Update existing source
        const source = mapInstance.getSource(
          "route-arrow"
        ) as mapboxgl.GeoJSONSource;
        source.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        });
      }

      // Add route background if it doesn't exist
      if (!mapInstance.getSource("route")) {
        mapInstance.addSource("route", {
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
      } else {
        // Update existing source
        const source = mapInstance.getSource("route") as mapboxgl.GeoJSONSource;
        source.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        });
      }

      // Add a larger arrow at the end
      addEndArrow(coordinates);
    } catch (error) {
      // Silent error handling
    }
  },
  handleLiveUpdate: (prevPosition: Position, newPosition: Position): void => {
    // Validate the positions
    if (
      !mapService.isValidPosition(prevPosition) ||
      !mapService.isValidPosition(newPosition)
    ) {
      return;
    }

    handleLivePositionUpdate(prevPosition, newPosition);
  },

  showDeviceAtLastPosition: (
    position: Position,
    deviceName: string,
    deviceImage: string
  ): void => {
    if (!mapInstance || markers.length === 0) return;

    // Get the last marker (current position)
    const lastMarker = markers[markers.length - 1];
    if (!lastMarker) return;

    // Get the marker element
    const markerElement = lastMarker.getElement();
    const markerType = markerElement.getAttribute("data-marker-type");

    // Only replace if it's not already a device marker
    if (markerType !== "current") {
      // Create new device marker element
      const newMarkerElement = createLastMarkerElement(deviceName, deviceImage);

      // Set attributes
      newMarkerElement.setAttribute("data-name", deviceName);
      newMarkerElement.setAttribute("data-image", deviceImage);
      newMarkerElement.setAttribute("data-marker-type", "current");

      // Update popup
      const popup = mapService.createCurrentPopup(
        position,
        deviceName,
        deviceImage
      );
      lastMarker.setPopup(popup);

      // Add click handler
      newMarkerElement.onclick = (e: MouseEvent) => {
        e.stopPropagation();

        // Close other popups
        markers.forEach((m) => {
          if (m !== lastMarker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup
        if (lastMarker.getPopup()?.isOpen()) {
          lastMarker.getPopup()?.remove();
        } else {
          lastMarker.togglePopup();
        }
      };

      // Replace marker element
      markerElement.replaceWith(newMarkerElement);
    }

    // Move marker to position if needed
    const markerLngLat = lastMarker.getLngLat();
    if (
      markerLngLat.lat !== position.latitude ||
      markerLngLat.lng !== position.longitude
    ) {
      lastMarker.setLngLat([position.longitude, position.latitude]);
    }
  },
};

export default mapService;
