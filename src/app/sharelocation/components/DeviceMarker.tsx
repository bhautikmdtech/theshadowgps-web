import mapboxgl from "mapbox-gl";

interface Position {
  lng: number;
  lat: number;
  address?: string;
  tm?: number;
  speed?: number;
}

interface Device {
  _id?: string;
  deviceName?: string;
  imageUrl?: string;
}

interface DeviceMarkerProps {
  position: Position;
  device?: Device | null;
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
}

export const createDeviceMarker = ({
  position,
  device,
  mapRef,
}: DeviceMarkerProps): mapboxgl.Marker | null => {
  if (!mapRef.current) {
    console.error("Map instance is not available");
    return null;
  }

  try {
    const container = document.createElement("div");
    container.className = "relative device-marker";
    container.innerHTML = `
      <!-- Pulse Animation -->
      <div class="absolute w-9 h-9 bg-green-500 opacity-50 rounded-full animate-ping"></div>

      <!-- Marker Circle -->
      <div class="relative w-9 h-9 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center hover:scale-110 hover:shadow-lg transition-transform">
          ${
            device?.imageUrl
              ? `<img src="${device.imageUrl}" class="w-6 h-6 rounded-full object-cover" onerror="this.style.display='none'">`
              : `<span class="text-sm font-bold text-white uppercase">${
                  device?.deviceName?.charAt(0) || "D"
                }</span>`
          }
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: container, anchor: "center" })
      .setLngLat([position.lng, position.lat])
      .addTo(mapRef.current);

    // Popup with detailed info
    const popup = new mapboxgl.Popup({
      offset: [0, 0],
      closeButton: true,
      closeOnClick: true,
      closeOnMove: true,
      maxWidth: "250px",
      className: "custom-popup",
    }).setHTML(`
      <div class="p-3 rounded-lg shadow-lg bg-white border">
          <div class="flex items-center space-x-2 mb-2">
              ${
                device?.imageUrl
                  ? `<img src="${device.imageUrl}" class="w-6 h-6 rounded-full object-cover" onerror="this.style.display='none'">`
                  : `<div class="w-6 h-6 bg-red-500 text-white flex items-center justify-center rounded-full text-xs font-bold">
                          ${device?.deviceName?.charAt(0) || "D"}
                      </div>`
              }
              <div>
                  <p class="font-bold text-gray-800 text-sm m-0">${
                    device?.deviceName || "Current Location"
                  }</p>
                  <span class="flex items-center text-xs text-green-500">
                      <span class="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Live Location
                  </span>
              </div>
          </div>
          <div class="text-xs text-gray-600 pb-1">${
            position.address ? `<div>Address: ${position.address}</div>` : ""
          }</div>
          <div class="text-xs text-gray-600 pb-1">${
            position.tm
              ? `<div>Time: ${new Date(
                  position.tm * 1000
                ).toLocaleString()}</div>`
              : ""
          }</div>
          <div class="text-xs text-gray-600 pb-1">${
            position.speed
              ? `<div>Speed: ${Math.round(position.speed)} km/h</div>`
              : ""
          }</div> 
      </div>
    `);

    marker.setPopup(popup);
    return marker;
  } catch (error) {
    console.error("Error creating device marker:", error);
    return null;
  }
};

export const createStartMarker = ({
  position,
  device,
  mapRef,
}: DeviceMarkerProps): mapboxgl.Marker | null => {
  if (!mapRef.current) {
    console.error("Map instance is not available");
    return null;
  }

  if (
    !position ||
    typeof position.lng !== "number" ||
    typeof position.lat !== "number"
  ) {
    console.error("Invalid position data:", position);
    return null;
  }

  try {
    // Create marker element
    const el = document.createElement("div");
    el.className = "relative device-marker";

    el.innerHTML = `
       <div class="w-[40px] h-[40px] rounded-full bg-[#23C16B] flex items-center justify-center shadow-lg border-0 hover:scale-110 hover:shadow-lg transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="2" x2="12" y2="5"></line>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="5" y2="12"></line>
            <line x1="19" y1="12" x2="22" y2="12"></line>
          </svg>
        </div>
    `;

    if (!mapRef.current.getSource) {
      console.warn("Map is not fully loaded, retrying in 500ms...");
      setTimeout(() => createStartMarker({ position, device, mapRef }), 500);
      return null;
    }

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([position.lng, position.lat])
      .addTo(mapRef.current);

    // Add popup
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="p-3 rounded-lg shadow-lg bg-white border">
          <div class="flex items-center space-x-2 mb-2">
              ${
                device?.imageUrl
                  ? `<img src="${device.imageUrl}" class="w-6 h-6 rounded-full object-cover" onerror="this.style.display='none'">`
                  : `<div class="w-6 h-6 bg-red-500 text-white flex items-center justify-center rounded-full text-xs font-bold">
                          ${device?.deviceName?.charAt(0) || "D"}
                      </div>`
              }
              <div>
                  <p class="font-bold text-gray-800 text-sm m-0">${
                    device?.deviceName || "Current Location"
                  }</p>
                  <span class="flex items-center text-xs text-green-500">
                      <span class="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Live Location
                  </span>
              </div>
          </div>
          <div class="text-xs text-gray-600 pb-1">${
            position.address ? `<div>Address: ${position.address}</div>` : ""
          }</div>
          <div class="text-xs text-gray-600 pb-1">${
            position.tm
              ? `<div>Time: ${new Date(
                  position.tm * 1000
                ).toLocaleString()}</div>`
              : ""
          }</div>
          <div class="text-xs text-gray-600 pb-1">${
            position.speed
              ? `<div>Speed: ${Math.round(position.speed)} km/h</div>`
              : ""
          }</div> 
      </div>
    `);

    marker.setPopup(popup);

    return marker;
  } catch (error) {
    console.error("Error creating start marker:", error);
    return null;
  }
};
