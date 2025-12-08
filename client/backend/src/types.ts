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

export interface SensorData {
  value: number;
  unit: string;
  timestamp: string;
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

export type MessageType = 
  | 'device_list' 
  | 'device_update' 
  | 'command' 
  | 'sensor_data' 
  | 'discovery'
  | 'device_connected'
  | 'device_disconnected'
  | 'gateway_status'
  | 'error';

export interface GatewayMessage {
  type: MessageType;
  payload: unknown;
  timestamp: string;
}

export interface CommandPayload {
  deviceId: string;
  command: 'toggle' | 'configure' | 'status';
  params?: DeviceConfig;
}

export interface GatewayStatusPayload {
  connected: boolean;
}

export interface ErrorPayload {
  message: string;
}

