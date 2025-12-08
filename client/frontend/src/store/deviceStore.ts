import { create } from 'zustand';
import type { Device, CommandMessage, DeviceConfig } from '../types/device';

interface ConnectionState {
  isConnected: boolean;
  gatewayAddress: string;
  lastError: string | null;
}

interface DeviceStore {
  // State
  devices: Device[];
  selectedDeviceId: string | null;
  connection: ConnectionState;
  isLoading: boolean;
  
  // Actions
  setDevices: (devices: Device[]) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  addDevice: (device: Device) => void;
  removeDevice: (deviceId: string) => void;
  selectDevice: (deviceId: string | null) => void;
  
  // Connection actions
  setConnected: (isConnected: boolean) => void;
  setGatewayAddress: (address: string) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  
  // Commands
  sendCommand: (command: CommandMessage) => void;
  toggleDevice: (deviceId: string) => void;
  configureDevice: (deviceId: string, config: DeviceConfig) => void;
}

// WebSocket instance (will be initialized later)
let ws: WebSocket | null = null;
let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

// Default WebSocket URL
const DEFAULT_WS_URL = 'ws://localhost:3001';

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  // Initial state
  devices: [],
  selectedDeviceId: null,
  connection: {
    isConnected: false,
    gatewayAddress: DEFAULT_WS_URL,
    lastError: null,
  },
  isLoading: false,

  // Device actions
  setDevices: (devices) => set({ devices }),
  
  updateDevice: (deviceId, updates) => set((state) => ({
    devices: state.devices.map((d) => 
      d.id === deviceId ? { ...d, ...updates } : d
    ),
  })),
  
  addDevice: (device) => set((state) => ({
    devices: [...state.devices.filter(d => d.id !== device.id), device],
  })),
  
  removeDevice: (deviceId) => set((state) => ({
    devices: state.devices.filter((d) => d.id !== deviceId),
    selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
  })),
  
  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  // Connection actions
  setConnected: (isConnected) => set((state) => ({
    connection: { ...state.connection, isConnected },
  })),
  
  setGatewayAddress: (address) => set((state) => ({
    connection: { ...state.connection, gatewayAddress: address },
  })),
  
  setError: (error) => set((state) => ({
    connection: { ...state.connection, lastError: error },
  })),
  
  setLoading: (isLoading) => set({ isLoading }),

  // Commands
  sendCommand: (command) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'command',
        payload: command,
        timestamp: new Date().toISOString(),
      }));
    } else {
      // Mock mode - simulate response
      const { devices, updateDevice } = get();
      const device = devices.find(d => d.id === command.deviceId);
      
      if (device && command.command === 'toggle') {
        setTimeout(() => {
          updateDevice(command.deviceId, { 
            isOn: !device.isOn,
            lastUpdate: new Date().toISOString(),
          });
        }, 300);
      } else if (device && command.command === 'configure' && command.params) {
        setTimeout(() => {
          updateDevice(command.deviceId, { 
            config: { ...device.config, ...command.params },
            lastUpdate: new Date().toISOString(),
          });
        }, 300);
      }
    }
  },
  
  toggleDevice: (deviceId) => {
    get().sendCommand({ deviceId, command: 'toggle' });
  },
  
  configureDevice: (deviceId, config) => {
    get().sendCommand({ deviceId, command: 'configure', params: config });
  },
}));

// Callbacks for connection events
let onConnectSuccess: (() => void) | null = null;
let onConnectError: ((error: string) => void) | null = null;

// WebSocket connection manager
export const connectToGateway = (
  address: string, 
  callbacks?: { onSuccess?: () => void; onError?: (error: string) => void }
) => {
  const store = useDeviceStore.getState();
  
  // Store callbacks
  onConnectSuccess = callbacks?.onSuccess || null;
  onConnectError = callbacks?.onError || null;
  
  // Close existing connection
  if (ws) {
    ws.close();
    ws = null;
  }
  
  // Clear existing timeout
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
  
  store.setLoading(true);
  store.setError(null);
  store.setGatewayAddress(address);
  
  // Set connection timeout (5 seconds)
  connectionTimeout = setTimeout(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      ws.close();
      ws = null;
      const errorMsg = 'Tempo limite de conexão excedido. Verifique se o backend está rodando.';
      store.setError(errorMsg);
      store.setLoading(false);
      onConnectError?.(errorMsg);
    }
  }, 5000);
  
  try {
    console.log(`🔌 Conectando ao WebSocket: ${address}`);
    ws = new WebSocket(address);
    
    ws.onopen = () => {
      console.log('✅ WebSocket conectado!');
      
      // Clear timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      store.setConnected(true);
      store.setError(null);
      store.setLoading(false);
      
      // Request device list
      ws?.send(JSON.stringify({
        type: 'device_list',
        payload: {},
        timestamp: new Date().toISOString(),
      }));
      
      // Call success callback
      onConnectSuccess?.();
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📩 Mensagem recebida:', message.type);
        
        switch (message.type) {
          case 'device_list':
            store.setDevices(message.payload);
            break;
          case 'device_update':
            store.updateDevice(message.payload.id, message.payload);
            break;
          case 'sensor_data':
            store.updateDevice(message.payload.deviceId, {
              sensorData: message.payload.data,
            });
            break;
          case 'device_connected':
            store.addDevice(message.payload);
            break;
          case 'device_disconnected':
            // Remover dispositivo da lista quando ele desconecta
            store.removeDevice(message.payload.deviceId);
            break;
          case 'gateway_status':
            if (message.payload.connected) {
              console.log('✅ Gateway conectado');
            } else {
              console.log('⚠️ Gateway desconectado');
            }
            break;
          case 'error':
            console.error('❌ Erro do servidor:', message.payload.message);
            store.setError(message.payload.message);
            break;
          case 'disconnected':
            console.log('🔌 Desconectado do Gateway');
            store.setConnected(false);
            store.setDevices([]);
            break;
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };
    
    ws.onclose = (event) => {
      console.log('❌ WebSocket fechado:', event.code, event.reason);
      
      // Clear timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      store.setConnected(false);
      store.setLoading(false);
      
      // If we were loading, it means connection failed
      if (store.isLoading) {
        const errorMsg = 'Conexão fechada inesperadamente';
        store.setError(errorMsg);
        onConnectError?.(errorMsg);
      }
    };
    
    ws.onerror = (event) => {
      console.error('❌ WebSocket erro:', event);
      
      // Clear timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      const errorMsg = 'Falha na conexão. Verifique se o backend está rodando em ' + address;
      store.setError(errorMsg);
      store.setConnected(false);
      store.setLoading(false);
      
      onConnectError?.(errorMsg);
    };
  } catch (err) {
    console.error('❌ Erro ao criar WebSocket:', err);
    
    // Clear timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    
    const errorMsg = 'Não foi possível conectar ao Gateway: ' + (err as Error).message;
    store.setError(errorMsg);
    store.setLoading(false);
    
    onConnectError?.(errorMsg);
  }
};

export const disconnectFromGateway = () => {
  const store = useDeviceStore.getState();
  
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    // Enviar comando de desconexão para o backend
    ws.send(JSON.stringify({
      type: 'disconnect',
      payload: {},
      timestamp: new Date().toISOString(),
    }));
    
    // Fechar conexão após enviar comando
    setTimeout(() => {
      if (ws) {
        ws.close();
        ws = null;
      }
    }, 100);
  } else if (ws) {
    ws.close();
    ws = null;
  }
  
  store.setConnected(false);
  store.setDevices([]);
  store.setError(null);
};
