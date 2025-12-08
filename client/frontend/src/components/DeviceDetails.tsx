import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Camera, 
  TrafficCone, 
  Lamp, 
  Wind, 
  Thermometer,
  Power,
  Clock,
  Wifi,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useDeviceStore } from '../store/deviceStore';
import type { DeviceType } from '../types/device';
import { useState, useEffect } from 'react';

const deviceIcons: Record<DeviceType, typeof Camera> = {
  camera: Camera,
  traffic_light: TrafficCone,
  street_lamp: Lamp,
  air_quality_sensor: Wind,
  temperature_sensor: Thermometer,
};

const deviceLabels: Record<DeviceType, string> = {
  camera: 'Câmera de Vigilância',
  traffic_light: 'Semáforo Inteligente',
  street_lamp: 'Poste de Iluminação',
  air_quality_sensor: 'Sensor de Qualidade do Ar',
  temperature_sensor: 'Sensor de Temperatura',
};

export function DeviceDetails() {
  const { devices, selectedDeviceId, selectDevice, toggleDevice, configureDevice } = useDeviceStore();
  const device = devices.find(d => d.id === selectedDeviceId);
  
  const [localConfig, setLocalConfig] = useState(device?.config || {});
  
  useEffect(() => {
    if (device) {
      setLocalConfig(device.config);
    }
  }, [device]);
  
  if (!device) return null;
  
  const Icon = deviceIcons[device.type];
  const isSensor = device.type === 'temperature_sensor' || device.type === 'air_quality_sensor';
  
  const handleSave = () => {
    configureDevice(device.id, localConfig);
  };
  
  // Verificar alerta atual
  const checkAlert = () => {
    if (!device.sensorData) return null;
    
    if (device.type === 'temperature_sensor') {
      const minTemp = (localConfig.alertMinTemp as number) ?? 0;
      const maxTemp = (localConfig.alertMaxTemp as number) ?? 40;
      if (device.sensorData.value < minTemp) return `Abaixo de ${minTemp}°C`;
      if (device.sensorData.value > maxTemp) return `Acima de ${maxTemp}°C`;
    }
    
    if (device.type === 'air_quality_sensor') {
      const threshold = (localConfig.alertThreshold as number) ?? 100;
      if (device.sensorData.value > threshold) return `AQI acima de ${threshold}`;
    }
    
    return null;
  };
  
  const alertMessage = checkAlert();
  
  const renderConfigFields = () => {
    switch (device.type) {
      case 'camera':
        return (
          <>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Resolução</label>
              <select
                value={localConfig.resolution as string || '1080p'}
                onChange={(e) => setLocalConfig({ ...localConfig, resolution: e.target.value })}
                className="w-full px-4 py-3 bg-primary-50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-accent-cyan transition-all cursor-pointer"
              >
                <option value="720p">HD (720p)</option>
                <option value="1080p">Full HD (1080p)</option>
                <option value="4K">4K Ultra HD</option>
              </select>
            </div>
          </>
        );
        
      case 'traffic_light':
        return (
          <>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Mudar Cor Manualmente</label>
              <div className="flex gap-3">
                {(['red', 'yellow', 'green'] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() => setLocalConfig({ ...localConfig, currentState: color })}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                      localConfig.currentState === color 
                        ? color === 'red' ? 'bg-red-500/20 border-red-500' 
                        : color === 'yellow' ? 'bg-yellow-500/20 border-yellow-500' 
                        : 'bg-green-500/20 border-green-500'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mx-auto ${
                      color === 'red' ? 'bg-red-500' 
                      : color === 'yellow' ? 'bg-yellow-500' 
                      : 'bg-green-500'
                    } ${localConfig.currentState === color ? 'animate-pulse' : 'opacity-50'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg">
              <Info size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500">
                O semáforo muda automaticamente a cada 10 segundos. 
                Use os botões acima para forçar uma mudança manual.
              </p>
            </div>
          </>
        );
        
      case 'street_lamp':
        return (
          <>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Luminosidade ({localConfig.brightness || 100}%)</label>
              <input
                type="range"
                value={localConfig.brightness as number || 100}
                onChange={(e) => setLocalConfig({ ...localConfig, brightness: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-accent-cyan"
                min={0}
                max={100}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </>
        );
        
      case 'air_quality_sensor':
        return (
          <>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Limite de Alerta (AQI)</label>
              <input
                type="number"
                value={localConfig.alertThreshold as number || 100}
                onChange={(e) => setLocalConfig({ ...localConfig, alertThreshold: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-primary-50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-accent-cyan transition-all"
                min={0}
                max={500}
              />
              <p className="text-xs text-slate-500 mt-2">
                Alerta será exibido quando o AQI ultrapassar este valor.
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-500">
                <strong>Referência AQI:</strong><br/>
                0-50: Bom | 51-100: Moderado | 101-150: Insalubre (sensíveis) | 151+: Insalubre
              </p>
            </div>
          </>
        );
        
      case 'temperature_sensor':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Temp. Mínima (°C)</label>
                <input
                  type="number"
                  value={localConfig.alertMinTemp as number || 0}
                  onChange={(e) => setLocalConfig({ ...localConfig, alertMinTemp: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-primary-50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-accent-cyan transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Temp. Máxima (°C)</label>
                <input
                  type="number"
                  value={localConfig.alertMaxTemp as number || 40}
                  onChange={(e) => setLocalConfig({ ...localConfig, alertMaxTemp: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-primary-50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-accent-cyan transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Alerta será exibido quando a temperatura sair desta faixa.
            </p>
          </>
        );
    }
  };
  
  return (
    <AnimatePresence>
      {selectedDeviceId && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => selectDevice(null)}
          />
          
          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-primary-200 border-l border-slate-800 z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-primary-200 border-b border-slate-800 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                  <Icon size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{device.name}</h2>
                  <p className="text-sm text-slate-500">{deviceLabels[device.type]}</p>
                </div>
              </div>
              <button
                onClick={() => selectDevice(null)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-50 text-slate-400 hover:text-slate-100 hover:bg-primary-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Alert Banner */}
              {alertMessage && (
                <div className="flex items-center gap-3 p-4 bg-accent-red/10 border border-accent-red/30 rounded-xl">
                  <AlertTriangle size={20} className="text-accent-red flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-accent-red">Alerta Ativo</p>
                    <p className="text-xs text-slate-400">{alertMessage}</p>
                  </div>
                </div>
              )}
              
              {/* Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Wifi size={14} />
                    <span className="text-xs">Status</span>
                  </div>
                  <span className={`font-semibold ${device.status === 'online' ? 'text-accent-green' : 'text-accent-red'}`}>
                    {device.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="bg-primary-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Clock size={14} />
                    <span className="text-xs">Última Atualização</span>
                  </div>
                  <span className="font-semibold text-slate-300 text-sm">
                    {new Date(device.lastUpdate).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              </div>
              
              {/* Connection Info */}
              <div className="bg-primary-100 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Informações de Conexão</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Endereço IP</span>
                    <span className="font-mono text-slate-300">{device.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Porta</span>
                    <span className="font-mono text-slate-300">{device.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID</span>
                    <span className="font-mono text-slate-300 text-sm">{device.id}</span>
                  </div>
                </div>
              </div>
              
              {/* Sensor Data */}
              {device.sensorData && (
                <div className={`bg-primary-100 rounded-xl p-4 ${alertMessage ? 'ring-2 ring-accent-red/50' : ''}`}>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Dados do Sensor</h3>
                  <div className="text-center py-4">
                    <span className={`text-4xl font-bold font-mono ${alertMessage ? 'text-accent-red' : 'text-accent-cyan'}`}>
                      {typeof device.sensorData.value === 'number' 
                        ? device.sensorData.value.toFixed(1) 
                        : device.sensorData.value}
                    </span>
                    <span className="text-xl text-slate-500 ml-2">{device.sensorData.unit}</span>
                  </div>
                </div>
              )}
              
              {/* Power Control */}
              {!isSensor && (
                <div className="bg-primary-100 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Controle</h3>
                  <button
                    onClick={() => toggleDevice(device.id)}
                    disabled={device.status === 'offline'}
                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition-all ${
                      device.type === 'traffic_light'
                        ? 'bg-accent-amber text-primary hover:bg-accent-amber/80'
                        : device.isOn
                          ? 'bg-accent-green text-primary hover:bg-accent-green/80'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Power size={20} />
                    {device.type === 'traffic_light' 
                      ? 'Mudar Cor' 
                      : device.isOn 
                        ? 'Desligar' 
                        : 'Ligar'
                    }
                  </button>
                </div>
              )}
              
              {/* Configuration */}
              <div className="bg-primary-100 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-4">
                  {isSensor ? 'Configurações de Alerta' : 'Configurações'}
                </h3>
                <div className="space-y-4">
                  {renderConfigFields()}
                </div>
              </div>
              
              {/* Save Button */}
              <button
                onClick={handleSave}
                className="w-full bg-accent-cyan hover:bg-accent-cyan/80 text-primary font-semibold flex items-center justify-center gap-2 py-4 rounded-xl transition-all"
              >
                <Save size={18} />
                Salvar Configurações
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
