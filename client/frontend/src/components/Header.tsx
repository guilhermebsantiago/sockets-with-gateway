import { Wifi, WifiOff, Settings } from "lucide-react";
import { useDeviceStore, disconnectFromGateway } from "../store/deviceStore";
import { motion } from "framer-motion";

interface HeaderProps {
  onOpenSettings?: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { connection, devices } = useDeviceStore();

  const onlineDevices = devices.filter((d) => d.status === "online").length;

  const handleDisconnect = () => {
    if (confirm("Deseja desconectar do Gateway?")) {
      disconnectFromGateway();
    }
  };

  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-gradient-to-b from-primary-200 to-transparent border-b border-slate-800 sticky top-0 z-50 backdrop-blur-xl">
      <div className="flex items-center gap-3 md:gap-4">
        <motion.div
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl overflow-hidden shadow-glow-cyan"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <img
            src="/favicon.svg"
            alt="Smart City Logo"
            className="w-full h-full"
          />
        </motion.div>
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-accent-cyan bg-clip-text text-transparent leading-tight">
            Smart City
          </h1>
          <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest font-medium">
            Control Panel
          </span>
        </div>
      </div>

      <div className="hidden md:flex gap-8">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold font-mono text-slate-100">
            {devices.length}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Dispositivos
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold font-mono text-accent-green">
            {onlineDevices}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Online
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
            connection.isConnected
              ? "bg-accent-green/10 border border-accent-green text-accent-green hover:bg-accent-green/20"
              : "bg-accent-red/10 border border-accent-red text-accent-red hover:bg-accent-red/20"
          }`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={connection.isConnected ? handleDisconnect : onOpenSettings}
          title={
            connection.isConnected
              ? "Clique para desconectar"
              : "Clique para conectar"
          }
        >
          {connection.isConnected ? (
            <>
              <Wifi size={16} className="animate-pulse-glow" />
              <span className="hidden md:inline">Gateway Conectado</span>
            </>
          ) : (
            <>
              <WifiOff size={16} />
              <span className="hidden md:inline">Desconectado</span>
            </>
          )}
        </motion.button>

        <button
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center bg-primary-50 border border-slate-700 rounded-xl text-slate-400 hover:bg-primary-100 hover:text-slate-100 hover:border-accent-cyan transition-all duration-200"
          title="Configurações de conexão"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
