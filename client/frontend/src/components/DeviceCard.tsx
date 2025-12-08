import { motion } from 'framer-motion';
import { 
  Camera, 
  TrafficCone, 
  Lamp, 
  Wind, 
  Thermometer,
  Power,
  Settings,
  Circle
} from 'lucide-react';
import type { Device, DeviceType } from '../types/device';
import { useDeviceStore } from '../store/deviceStore';

interface DeviceCardProps {
  device: Device;
  index: number;
}

const deviceIcons: Record<DeviceType, typeof Camera> = {
  camera: Camera,
  traffic_light: TrafficCone,
  street_lamp: Lamp,
  air_quality_sensor: Wind,
  temperature_sensor: Thermometer,
};

const deviceLabels: Record<DeviceType, string> = {
  camera: 'Câmera',
  traffic_light: 'Semáforo',
  street_lamp: 'Poste',
  air_quality_sensor: 'Qualidade do Ar',
  temperature_sensor: 'Temperatura',
};

const deviceColorClasses: Record<DeviceType, { bg: string; text: string; border: string; shadow: string }> = {
  camera: { 
    bg: 'bg-accent-purple/10', 
    text: 'text-accent-purple', 
    border: 'border-accent-purple/30 hover:border-accent-purple/60',
    shadow: 'hover:shadow-glow-purple'
  },
  traffic_light: { 
    bg: 'bg-accent-amber/10', 
    text: 'text-accent-amber', 
    border: 'border-accent-amber/30 hover:border-accent-amber/60',
    shadow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
  },
  street_lamp: { 
    bg: 'bg-accent-cyan/10', 
    text: 'text-accent-cyan', 
    border: 'border-accent-cyan/30 hover:border-accent-cyan/60',
    shadow: 'hover:shadow-glow-cyan'
  },
  air_quality_sensor: { 
    bg: 'bg-accent-green/10', 
    text: 'text-accent-green', 
    border: 'border-accent-green/30 hover:border-accent-green/60',
    shadow: 'hover:shadow-glow-green'
  },
  temperature_sensor: { 
    bg: 'bg-accent-red/10', 
    text: 'text-accent-red', 
    border: 'border-accent-red/30 hover:border-accent-red/60',
    shadow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
  },
};

export function DeviceCard({ device, index }: DeviceCardProps) {
  const { selectDevice, toggleDevice, selectedDeviceId } = useDeviceStore();
  
  const Icon = deviceIcons[device.type];
  const colors = deviceColorClasses[device.type];
  const isSelected = selectedDeviceId === device.id;
  const isSensor = device.type === 'temperature_sensor' || device.type === 'air_quality_sensor';
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleDevice(device.id);
  };
  
  // Formatar valor do sensor para display
  const formatSensorValue = (value: number) => {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(1);
  };
  
  return (
    <motion.div
      className={`
        relative bg-primary-100 rounded-2xl p-5 cursor-pointer border transition-all duration-300
        ${colors.border} ${colors.shadow}
        ${isSelected ? 'ring-2 ring-accent-cyan ring-offset-2 ring-offset-primary' : ''}
        ${device.status === 'offline' ? 'opacity-60' : ''}
      `}
      onClick={() => selectDevice(device.id)}
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ 
        opacity: 0, 
        scale: 0.8, 
        y: -20,
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}>
          <Icon size={24} />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Circle 
            size={8} 
            fill={device.status === 'online' ? '#10b981' : '#ef4444'} 
            color={device.status === 'online' ? '#10b981' : '#ef4444'} 
          />
          <span className={device.status === 'online' ? 'text-accent-green' : 'text-accent-red'}>
            {device.status === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">{device.name}</h3>
        <p className="text-sm text-slate-500">{deviceLabels[device.type]}</p>
        
        {device.sensorData && (
          <div className="mt-3 flex items-baseline gap-1">
            <span className={`text-3xl font-bold font-mono ${colors.text}`}>
              {formatSensorValue(device.sensorData.value)}
            </span>
            <span className="text-sm text-slate-500">{device.sensorData.unit}</span>
          </div>
        )}
        
        <p className="mt-2 text-xs text-slate-600 font-mono">{device.ip}:{device.port}</p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {!isSensor && (
          <button 
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${device.isOn 
                ? 'bg-accent-green/20 text-accent-green border border-accent-green/30 hover:bg-accent-green/30' 
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            onClick={handleToggle}
            disabled={device.status === 'offline'}
          >
            <Power size={16} />
            <span>{device.isOn ? 'Ligado' : 'Desligado'}</span>
          </button>
        )}
        
        <button 
          className="w-10 h-10 flex items-center justify-center bg-primary-50 border border-slate-700 rounded-xl text-slate-400 hover:bg-primary-100 hover:text-slate-100 hover:border-accent-cyan transition-all duration-200"
          onClick={(e) => { e.stopPropagation(); selectDevice(device.id); }}
        >
          <Settings size={16} />
        </button>
      </div>
    </motion.div>
  );
}
