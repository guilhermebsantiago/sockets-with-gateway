import net from 'net';
import type { Device, GatewayMessage, CommandPayload } from './types.js';

// Mock Gateway Server - Simulates the real Gateway for testing
const PORT = parseInt(process.env.GATEWAY_PORT || '4000');

// Mock devices state
const devices: Map<string, Device> = new Map([
  ['cam-001', {
    id: 'cam-001',
    name: 'Câmera Praça Central',
    type: 'camera',
    status: 'online',
    isOn: true,
    ip: '192.168.1.10',
    port: 5000,
    lastUpdate: new Date().toISOString(),
    config: { resolution: '1080p', nightVision: true, motionDetection: true },
  }],
  ['sem-001', {
    id: 'sem-001',
    name: 'Semáforo Av. Principal',
    type: 'traffic_light',
    status: 'online',
    isOn: true,
    ip: '192.168.1.20',
    port: 5001,
    lastUpdate: new Date().toISOString(),
    config: { currentState: 'green', redDuration: 30, yellowDuration: 5, greenDuration: 25 },
  }],
  ['pos-001', {
    id: 'pos-001',
    name: 'Poste Rua das Flores',
    type: 'street_lamp',
    status: 'online',
    isOn: true,
    ip: '192.168.1.30',
    port: 5002,
    lastUpdate: new Date().toISOString(),
    config: { brightness: 80, autoMode: true },
  }],
  ['pos-002', {
    id: 'pos-002',
    name: 'Poste Praça Central',
    type: 'street_lamp',
    status: 'online',
    isOn: false,
    ip: '192.168.1.31',
    port: 5003,
    lastUpdate: new Date().toISOString(),
    config: { brightness: 100, autoMode: false },
  }],
  ['temp-001', {
    id: 'temp-001',
    name: 'Sensor Temp. Centro',
    type: 'temperature_sensor',
    status: 'online',
    isOn: true,
    ip: '192.168.1.40',
    port: 5004,
    lastUpdate: new Date().toISOString(),
    config: { alertMinTemp: 5, alertMaxTemp: 35 },
    sensorData: { value: 23.5, unit: '°C', timestamp: new Date().toISOString() },
  }],
  ['air-001', {
    id: 'air-001',
    name: 'Sensor Ar Centro',
    type: 'air_quality_sensor',
    status: 'online',
    isOn: true,
    ip: '192.168.1.50',
    port: 5005,
    lastUpdate: new Date().toISOString(),
    config: { alertThreshold: 100 },
    sensorData: { value: 42, unit: 'AQI', timestamp: new Date().toISOString() },
  }],
  ['cam-002', {
    id: 'cam-002',
    name: 'Câmera Estacionamento',
    type: 'camera',
    status: 'offline',
    isOn: false,
    ip: '192.168.1.11',
    port: 5006,
    lastUpdate: new Date(Date.now() - 3600000).toISOString(),
    config: { resolution: '720p', nightVision: false, motionDetection: true },
  }],
]);

// Connected clients
const clients: Set<net.Socket> = new Set();

// Send message to a client (JSON Lines format - one JSON per line)
function sendMessage(socket: net.Socket, message: GatewayMessage): void {
  const jsonLine = JSON.stringify(message) + '\n';
  socket.write(jsonLine);
}

// Broadcast to all clients
function broadcast(message: GatewayMessage): void {
  clients.forEach(client => {
    if (!client.destroyed) {
      sendMessage(client, message);
    }
  });
}

// Handle incoming messages
function handleMessage(socket: net.Socket, message: GatewayMessage): void {
  console.log(`📨 Mensagem recebida: ${message.type}`);
  
  switch (message.type) {
    case 'device_list':
      sendMessage(socket, {
        type: 'device_list',
        payload: Array.from(devices.values()),
        timestamp: new Date().toISOString(),
      });
      break;
      
    case 'command':
      const cmd = message.payload as CommandPayload;
      const device = devices.get(cmd.deviceId);
      
      if (device) {
        if (cmd.command === 'toggle') {
          device.isOn = !device.isOn;
          device.lastUpdate = new Date().toISOString();
          console.log(`⚡ ${device.name}: ${device.isOn ? 'LIGADO' : 'DESLIGADO'}`);
        } else if (cmd.command === 'configure' && cmd.params) {
          device.config = { ...device.config, ...cmd.params };
          device.lastUpdate = new Date().toISOString();
          console.log(`⚙️  ${device.name}: configuração atualizada`);
        }
        
        // Broadcast device update
        broadcast({
          type: 'device_update',
          payload: device,
          timestamp: new Date().toISOString(),
        });
      }
      break;
  }
}

// Create TCP server
const server = net.createServer((socket) => {
  const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`✅ Cliente conectado: ${clientAddr}`);
  clients.add(socket);
  
  let receiveBuffer = '';
  
  socket.on('data', (data) => {
    // JSON Lines format
    receiveBuffer += data.toString();
    
    const lines = receiveBuffer.split('\n');
    receiveBuffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as GatewayMessage;
          handleMessage(socket, message);
        } catch (err) {
          console.error('❌ Erro ao processar mensagem:', (err as Error).message);
        }
      }
    }
  });
  
  socket.on('close', () => {
    console.log(`❌ Cliente desconectado: ${clientAddr}`);
    clients.delete(socket);
  });
  
  socket.on('error', (err) => {
    console.error('❌ Erro no socket:', err.message);
  });
});

// Simulate sensor updates
setInterval(() => {
  // Update temperature sensor
  const tempSensor = devices.get('temp-001');
  if (tempSensor && tempSensor.sensorData) {
    const variation = (Math.random() - 0.5) * 2;
    tempSensor.sensorData.value = Math.round((tempSensor.sensorData.value + variation) * 10) / 10;
    tempSensor.sensorData.value = Math.max(15, Math.min(35, tempSensor.sensorData.value));
    tempSensor.sensorData.timestamp = new Date().toISOString();
    tempSensor.lastUpdate = new Date().toISOString();
    
    broadcast({
      type: 'sensor_data',
      payload: { deviceId: tempSensor.id, data: tempSensor.sensorData },
      timestamp: new Date().toISOString(),
    });
  }
  
  // Update air quality sensor
  const airSensor = devices.get('air-001');
  if (airSensor && airSensor.sensorData) {
    const variation = Math.floor((Math.random() - 0.5) * 10);
    airSensor.sensorData.value = Math.max(20, Math.min(150, airSensor.sensorData.value + variation));
    airSensor.sensorData.timestamp = new Date().toISOString();
    airSensor.lastUpdate = new Date().toISOString();
    
    broadcast({
      type: 'sensor_data',
      payload: { deviceId: airSensor.id, data: airSensor.sensorData },
      timestamp: new Date().toISOString(),
    });
  }
}, 5000);

// Simulate traffic light changes
setInterval(() => {
  const trafficLight = devices.get('sem-001');
  if (trafficLight && trafficLight.isOn) {
    const states: ('red' | 'yellow' | 'green')[] = ['red', 'yellow', 'green'];
    const currentIndex = states.indexOf(trafficLight.config.currentState as 'red' | 'yellow' | 'green');
    const nextIndex = (currentIndex + 1) % states.length;
    trafficLight.config.currentState = states[nextIndex];
    trafficLight.lastUpdate = new Date().toISOString();
    
    console.log(`🚦 Semáforo: ${trafficLight.config.currentState.toUpperCase()}`);
    
    broadcast({
      type: 'device_update',
      payload: trafficLight,
      timestamp: new Date().toISOString(),
    });
  }
}, 10000);

// Start server
server.listen(PORT, () => {
  console.log(`\n🏙️  Mock Gateway Smart City`);
  console.log(`📡 TCP Server rodando na porta ${PORT}`);
  console.log(`📦 ${devices.size} dispositivos simulados\n`);
  console.log('Dispositivos:');
  devices.forEach(d => {
    console.log(`  - ${d.name} (${d.type}) [${d.status}]`);
  });
  console.log('\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando Mock Gateway...');
  
  clients.forEach(client => client.destroy());
  
  server.close(() => {
    console.log('✅ Mock Gateway encerrado');
    process.exit(0);
  });
});
