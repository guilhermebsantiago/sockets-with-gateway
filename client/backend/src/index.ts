import { WebSocketServer, WebSocket } from 'ws';
import net from 'net';
import type { GatewayMessage, Device, DeviceType } from './types.js';

const WS_PORT = parseInt(process.env.WS_PORT || '3001');
const GATEWAY_HOST = process.env.GATEWAY_HOST || 'localhost';
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '9000');

let tcpClient: net.Socket | null = null;
let isGatewayConnected = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
let manualDisconnect = false;

const devices: Map<string, Device> = new Map();

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`🚀 WebSocket Server rodando na porta ${WS_PORT}`);

function mapDeviceType(tipoGateway: string, id: string): DeviceType {
  const idLower = id.toLowerCase();
  if (idLower.includes('semaforo')) return 'traffic_light';
  if (idLower.includes('poste') || idLower.includes('luz')) return 'street_lamp';
  if (idLower.includes('radar') || idLower.includes('camera') || idLower.includes('cam')) return 'camera';
  if (idLower.includes('temp')) return 'temperature_sensor';
  if (idLower.includes('ar') || idLower.includes('air') || idLower.includes('qualidade')) return 'air_quality_sensor';
  
  if (tipoGateway === 'SENSOR') return 'temperature_sensor';
  if (tipoGateway === 'MISTO') return 'camera';
  return 'camera';
}

function formatDeviceName(id: string): string {
  return id
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createDevice(id: string, tipo: string, porta?: number): Device {
  const deviceType = mapDeviceType(tipo, id);
  const isSensor = deviceType === 'temperature_sensor' || deviceType === 'air_quality_sensor';
  
  return {
    id,
    name: formatDeviceName(id),
    type: deviceType,
    status: 'online',
    isOn: true,
    ip: GATEWAY_HOST,
    port: porta || GATEWAY_PORT,
    lastUpdate: new Date().toISOString(),
    config: getDefaultConfig(deviceType),
    sensorData: isSensor ? undefined : undefined,
  };
}

function getDefaultConfig(type: DeviceType): Record<string, unknown> {
  switch (type) {
    case 'traffic_light':
      return { currentState: 'red', redDuration: 30, yellowDuration: 5, greenDuration: 25 };
    case 'street_lamp':
      return { brightness: 100, autoMode: false };
    case 'camera':
      return { resolution: '1080p', nightVision: true, motionDetection: true };
    default:
      return {};
  }
}

function broadcast(message: GatewayMessage): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastDeviceList(): void {
  broadcast({
    type: 'device_list',
    payload: Array.from(devices.values()),
    timestamp: new Date().toISOString(),
  });
}

function sendToGateway(deviceId: string, action: string, param: string): boolean {
  if (!tcpClient || !isGatewayConnected) {
    console.warn('⚠️  Gateway não conectado');
    return false;
  }
  
  try {
    const command = `${deviceId}:${action}:${param}\n`;
    console.log(`📤 Enviando comando: ${command.trim()}`);
    tcpClient.write(command);
    return true;
  } catch (err) {
    console.error('❌ Erro ao enviar para Gateway:', (err as Error).message);
    return false;
  }
}

function parseGatewayMessage(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  
  const registroMatch = trimmed.match(/\[REGISTRO\]\s*([^:]+):([^:]+):(\d+)/);
  if (registroMatch) {
    const [, deviceId, tipo, porta] = registroMatch;
    
    if (!devices.has(deviceId)) {
      const device = createDevice(deviceId, tipo, parseInt(porta));
      devices.set(deviceId, device);
      
      console.log(`📱 Novo dispositivo: ${deviceId} (${tipo})`);
      
      broadcast({
        type: 'device_connected',
        payload: device,
        timestamp: new Date().toISOString(),
      });
      
      broadcastDeviceList();
    }
    return;
  }
  
  const desregistroMatch = trimmed.match(/\[DESREGISTRO\]\s*(.+)/);
  if (desregistroMatch) {
    const deviceId = desregistroMatch[1].trim();
    
    if (devices.has(deviceId)) {
      devices.delete(deviceId);
      
      console.log(`📴 Dispositivo removido: ${deviceId}`);
      
      broadcast({
        type: 'device_disconnected',
        payload: { deviceId },
        timestamp: new Date().toISOString(),
      });
      
      broadcastDeviceList();
    }
    return;
  }
  
  const dadosMatch = trimmed.match(/\[([^\]]+)\]\s*([^:]+):\s*([\d.]+)\s*(.+)/);
  if (dadosMatch) {
    const [, deviceId, tipoLeitura, valor, unidade] = dadosMatch;
    
    let device = devices.get(deviceId);
    if (!device) {
      device = createDevice(deviceId, 'MISTO');
      devices.set(deviceId, device);
      
      broadcast({
        type: 'device_connected',
        payload: device,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (tipoLeitura.trim() === 'COR_SEMAFORO') {
      const cor = unidade.trim().toLowerCase();
      let currentState = 'red';
      if (cor === 'verde' || cor === 'green') currentState = 'green';
      else if (cor === 'amarelo' || cor === 'yellow') currentState = 'yellow';
      else currentState = 'red';
      
      device.config.currentState = currentState;
      device.lastUpdate = new Date().toISOString();
      
      console.log(`🚦 Semáforo [${deviceId}]: ${cor} -> ${currentState}`);
      
      broadcast({
        type: 'device_update',
        payload: device,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    device.sensorData = {
      value: parseFloat(valor),
      unit: unidade.trim(),
      timestamp: new Date().toISOString(),
    };
    device.lastUpdate = new Date().toISOString();
    
    console.log(`📊 Sensor [${deviceId}]: ${valor} ${unidade}`);
    
    broadcast({
      type: 'sensor_data',
      payload: { deviceId, data: device.sensorData },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  if (trimmed.startsWith('[OK]')) {
    console.log(`✅ ${trimmed}`);
    return;
  }
}

function connectToGateway(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  tcpClient = new net.Socket();
  
  let receiveBuffer = '';
  
  tcpClient.connect(GATEWAY_PORT, GATEWAY_HOST, () => {
    console.log(`✅ Conectado ao Gateway em ${GATEWAY_HOST}:${GATEWAY_PORT}`);
    isGatewayConnected = true;
    
    broadcast({
      type: 'gateway_status',
      payload: { connected: true },
      timestamp: new Date().toISOString(),
    });
    
    setTimeout(() => {
      if (tcpClient) {
        tcpClient.write('LISTAR:\n');
      }
    }, 500);
  });
  
  tcpClient.on('data', (data: Buffer) => {
    receiveBuffer += data.toString();
    
    const lines = receiveBuffer.split('\n');
    receiveBuffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        console.log(`📩 Gateway: ${line.trim()}`);
        parseGatewayMessage(line);
      }
    }
  });
  
  tcpClient.on('close', () => {
    console.log('❌ Conexão com Gateway fechada');
    isGatewayConnected = false;
    tcpClient = null;
    
    broadcast({
      type: 'gateway_status',
      payload: { connected: false },
      timestamp: new Date().toISOString(),
    });
    
    if (!manualDisconnect) {
      console.log('🔄 Reconectando em 5 segundos...');
      reconnectTimeout = setTimeout(connectToGateway, 5000);
    }
  });
  
  tcpClient.on('error', (err: Error) => {
    if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      console.log(`⚠️  Gateway não disponível em ${GATEWAY_HOST}:${GATEWAY_PORT}`);
    } else {
      console.error('❌ Erro na conexão TCP:', err.message);
    }
  });
}

wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress || 'unknown';
  console.log(`📱 Cliente Web conectado: ${clientIP}`);
  
  ws.send(JSON.stringify({
    type: 'gateway_status',
    payload: { connected: isGatewayConnected },
    timestamp: new Date().toISOString(),
  } as GatewayMessage));
  
  ws.send(JSON.stringify({
    type: 'device_list',
    payload: Array.from(devices.values()),
    timestamp: new Date().toISOString(),
  } as GatewayMessage));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as GatewayMessage;
      console.log(`📨 Mensagem do cliente: ${message.type}`);
      
      if (message.type === 'device_list') {
        ws.send(JSON.stringify({
          type: 'device_list',
          payload: Array.from(devices.values()),
          timestamp: new Date().toISOString(),
        }));
      } else if (message.type === 'disconnect') {
        console.log('🔌 Desconexão manual solicitada');
        manualDisconnect = true;
        
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        
        if (tcpClient) {
          tcpClient.destroy();
          tcpClient = null;
        }
        
        isGatewayConnected = false;
        devices.clear();
        
        broadcast({
          type: 'gateway_status',
          payload: { connected: false },
          timestamp: new Date().toISOString(),
        });
        
        broadcast({
          type: 'device_list',
          payload: [],
          timestamp: new Date().toISOString(),
        });
        
        ws.send(JSON.stringify({
          type: 'disconnected',
          payload: { message: 'Desconectado do Gateway' },
          timestamp: new Date().toISOString(),
        }));
      } else if (message.type === 'connect') {
        console.log('🔌 Reconexão solicitada');
        manualDisconnect = false;
        
        if (!isGatewayConnected) {
          connectToGateway();
        }
      } else if (message.type === 'command') {
        const cmd = message.payload as { deviceId: string; command: string; params?: Record<string, unknown> };
        
        if (isGatewayConnected) {
          let action = '';
          let param = '';
          
          const device = devices.get(cmd.deviceId);
          
          if (cmd.command === 'toggle') {
            if (device?.type === 'traffic_light') {
              action = 'MUDAR_COR';
              const currentState = device.config.currentState as string || 'red';
              if (currentState === 'red' || currentState === 'vermelho') {
                param = 'VERDE';
                device.config.currentState = 'green';
              } else if (currentState === 'green' || currentState === 'verde') {
                param = 'AMARELO';
                device.config.currentState = 'yellow';
              } else {
                param = 'VERMELHO';
                device.config.currentState = 'red';
              }
            } else if (device?.type === 'street_lamp') {
              action = 'SET_INTENSIDADE';
              param = device.isOn ? '0%' : '100%';
              device.isOn = !device.isOn;
              device.config.brightness = device.isOn ? 100 : 0;
            } else if (device?.type === 'camera') {
              action = device.isOn ? 'DESLIGAR' : 'LIGAR';
              param = device.isOn ? 'OFF' : 'ON';
              device.isOn = !device.isOn;
            }
          } else if (cmd.command === 'configure' && cmd.params) {
            if (device?.type === 'traffic_light' && cmd.params.currentState) {
              action = 'MUDAR_COR';
              const cor = String(cmd.params.currentState).toUpperCase();
              if (cor === 'RED') {
                param = 'VERMELHO';
                device.config.currentState = 'red';
              } else if (cor === 'GREEN') {
                param = 'VERDE';
                device.config.currentState = 'green';
              } else {
                param = 'AMARELO';
                device.config.currentState = 'yellow';
              }
            } else if (device?.type === 'street_lamp' && cmd.params.brightness !== undefined) {
              action = 'SET_INTENSIDADE';
              param = `${cmd.params.brightness}%`;
              device.config.brightness = cmd.params.brightness;
              device.isOn = Number(cmd.params.brightness) > 0;
            } else if (device?.type === 'camera' && cmd.params.resolution) {
              action = 'SET_RESOLUCAO';
              param = String(cmd.params.resolution);
              device.config.resolution = cmd.params.resolution;
            }
          }
          
          if (action && param) {
            sendToGateway(cmd.deviceId, action, param);
            
            if (device) {
              device.lastUpdate = new Date().toISOString();
              
              broadcast({
                type: 'device_update',
                payload: device,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Gateway não conectado' },
            timestamp: new Date().toISOString(),
          } as GatewayMessage));
        }
      }
    } catch (err) {
      console.error('❌ Erro ao processar mensagem:', (err as Error).message);
    }
  });
  
  ws.on('close', () => {
    console.log(`📱 Cliente Web desconectado: ${clientIP}`);
  });
  
  ws.on('error', (err) => {
    console.error('❌ Erro WebSocket:', err.message);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  if (tcpClient) {
    tcpClient.destroy();
  }
  
  wss.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

console.log(`🔌 Tentando conectar ao Gateway em ${GATEWAY_HOST}:${GATEWAY_PORT}...`);
connectToGateway();
