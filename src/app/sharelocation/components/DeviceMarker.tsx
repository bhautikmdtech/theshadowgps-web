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
  if (!mapRef.current) return null;

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
};

export const createStartMarker = ({
  position,
  device,
  mapRef,
}: DeviceMarkerProps): mapboxgl.Marker | null => {
  if (!mapRef.current) return new mapboxgl.Marker();

  const el = document.createElement("div");
  el.className = "start-marker";
  el.style.width = "24px";
  el.style.height = "24px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#4267B2";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";

  // Add device image or initial
  if (device?.imageUrl) {
    const img = document.createElement("img");
    img.src = device.imageUrl;
    img.style.width = "18px";
    img.style.height = "18px";
    img.style.borderRadius = "50%";
    img.style.objectFit = "cover";
    img.onerror = () => {
      el.textContent = device?.deviceName?.charAt(0) || "S";
      el.style.color = "white";
      el.style.fontWeight = "bold";
    };
    el.appendChild(img);
  } else {
    el.textContent = device?.deviceName?.charAt(0) || "S";
    el.style.color = "white";
    el.style.fontWeight = "bold";
  }

  const marker = new mapboxgl.Marker({
    element: el,
    anchor: "center",
  })
    .setLngLat([position.lng, position.lat])
    .addTo(mapRef.current);

  // Add popup
  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
    <div class="p-2">
      <h3 class="font-bold">${device?.deviceName || "Device"}</h3>
      <p>Start Position</p>
      <p class="text-sm">Lat: ${position.lat.toFixed(4)}</p>
      <p class="text-sm">Lng: ${position.lng.toFixed(4)}</p>
    </div>
  `);

  marker.setPopup(popup);
  return marker;
};
