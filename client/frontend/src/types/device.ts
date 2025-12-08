export type DeviceType = 
  | 'camera' 
  | 'traffic_light' 
  | 'street_lamp' 
  | 'air_quality_sensor' 
  | 'temperature_sensor';

export type DeviceStatus = 'online' | 'offline' | 'warning';

export interface DeviceConfig {
  [key: string]: string | number | boolean;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  isOn: boolean;
  ip: string;
  port: number;
  lastUpdate: string;
  config: DeviceConfig;
  sensorData?: SensorData;
}

export interface SensorData {
  value: number;
  unit: string;
  timestamp: string;
}

export interface CameraConfig extends DeviceConfig {
  resolution: '720p' | '1080p' | '4K';
  nightVision: boolean;
  motionDetection: boolean;
}

export interface TrafficLightConfig extends DeviceConfig {
  redDuration: number;
  yellowDuration: number;
  greenDuration: number;
  currentState: 'red' | 'yellow' | 'green';
}

export interface StreetLampConfig extends DeviceConfig {
  brightness: number;
  autoMode: boolean;
}

export interface AirQualityConfig extends DeviceConfig {
  alertThreshold: number;
}

export interface TemperatureConfig extends DeviceConfig {
  alertMinTemp: number;
  alertMaxTemp: number;
}

// Messages for Gateway communication
export interface GatewayMessage {
  type: 'device_list' | 'device_update' | 'command' | 'sensor_data' | 'discovery';
  payload: unknown;
  timestamp: string;
}

export interface CommandMessage {
  deviceId: string;
  command: 'toggle' | 'configure' | 'status';
  params?: DeviceConfig;
}

