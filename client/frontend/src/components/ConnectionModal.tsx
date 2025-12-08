import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, X, Loader2, AlertCircle, Zap, CheckCircle } from 'lucide-react';
import { useDeviceStore, connectToGateway } from '../store/deviceStore';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const { connection, isLoading } = useDeviceStore();
  const [address, setAddress] = useState(connection.gatewayAddress);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleConnect = () => {
    setLocalError(null);
    setShowSuccess(false);
    
    connectToGateway(address, {
      onSuccess: () => {
        setShowSuccess(true);
        // Close modal after showing success
        setTimeout(() => {
          onClose();
          setShowSuccess(false);
        }, 1000);
      },
      onError: (error) => {
        setLocalError(error);
      }
    });
  };
  
  const handleUseMock = () => {
    // Load mock data for testing
    useDeviceStore.getState().setDevices([
      {
        id: 'cam-001',
        name: 'Câmera Praça Central',
        type: 'camera',
        status: 'online',
        isOn: true,
        ip: '192.168.1.10',
        port: 5000,
        lastUpdate: new Date().toISOString(),
        config: { resolution: '1080p', nightVision: true, motionDetection: true },
      },
      {
        id: 'sem-001',
        name: 'Semáforo Av. Principal',
        type: 'traffic_light',
        status: 'online',
        isOn: true,
        ip: '192.168.1.20',
        port: 5001,
        lastUpdate: new Date().toISOString(),
        config: { currentState: 'green', redDuration: 30, yellowDuration: 5, greenDuration: 25 },
      },
      {
        id: 'pos-001',
        name: 'Poste Rua das Flores',
        type: 'street_lamp',
        status: 'online',
        isOn: true,
        ip: '192.168.1.30',
        port: 5002,
        lastUpdate: new Date().toISOString(),
        config: { brightness: 80, autoMode: true },
      },
      {
        id: 'pos-002',
        name: 'Poste Praça Central',
        type: 'street_lamp',
        status: 'online',
        isOn: false,
        ip: '192.168.1.31',
        port: 5003,
        lastUpdate: new Date().toISOString(),
        config: { brightness: 100, autoMode: false },
      },
      {
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
      },
      {
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
      },
      {
        id: 'cam-002',
        name: 'Câmera Estacionamento',
        type: 'camera',
        status: 'offline',
        isOn: false,
        ip: '192.168.1.11',
        port: 5006,
        lastUpdate: new Date(Date.now() - 3600000).toISOString(),
        config: { resolution: '720p', nightVision: false, motionDetection: true },
      },
    ]);
    onClose();
  };

  const displayError = localError || connection.lastError;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 mx-auto max-w-md bg-primary-200 rounded-2xl border border-slate-800 z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                  <Wifi size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Conectar ao Gateway</h2>
                  <p className="text-sm text-slate-500">Configure a conexão com o servidor</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-primary-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Success Message */}
              {showSuccess && (
                <motion.div 
                  className="flex items-center gap-3 p-4 bg-accent-green/10 border border-accent-green/30 rounded-xl text-accent-green"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <CheckCircle size={20} />
                  <span className="text-sm font-medium">Conectado com sucesso!</span>
                </motion.div>
              )}
              
              {/* Error Message */}
              {displayError && !showSuccess && (
                <motion.div 
                  className="flex items-start gap-3 p-4 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{displayError}</span>
                </motion.div>
              )}
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Endereço do Gateway</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ws://localhost:3001"
                  className="w-full px-4 py-3 bg-primary-100 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm placeholder-slate-500 outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all"
                  disabled={isLoading}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Certifique-se que o backend está rodando em <code className="text-accent-cyan">npm run dev</code>
                </p>
              </div>
              
              <button
                onClick={handleConnect}
                disabled={isLoading || !address || showSuccess}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Conectando...
                  </>
                ) : showSuccess ? (
                  <>
                    <CheckCircle size={18} />
                    Conectado!
                  </>
                ) : (
                  <>
                    <Wifi size={18} />
                    Conectar
                  </>
                )}
              </button>
              
              <div className="relative flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500 uppercase">ou</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              
              <button
                onClick={handleUseMock}
                disabled={isLoading}
                className="w-full btn-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                <Zap size={18} />
                Usar Dados de Demonstração
              </button>
              
              <p className="text-xs text-slate-500 text-center">
                Use o modo demonstração para testar a interface sem um Gateway real conectado.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
