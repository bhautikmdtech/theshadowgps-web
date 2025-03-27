export interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  speed?: number;
  direction?: number;
  address?: string;
}

export interface DeviceInfo {
  _id: string;
  deviceName: string;
  imageUrl?: string;
}

// Type for the location data points array (for better readability)
export type LocationPoints = Array<[number, number, number, number, number, number, string]>;

export interface LocationData {
  message: string;
  data: {
    deviceInfo: DeviceInfo;
    // Support both field names
    points?: LocationPoints; // [lat, lng, altitude, timestamp, speedLimit, direction, address]
    positions?: LocationPoints; // Legacy field name
    shareTitle: string;
    expiresAt: string;
  };
}
