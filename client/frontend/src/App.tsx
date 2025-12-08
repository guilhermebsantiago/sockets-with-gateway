import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DeviceList } from './components/DeviceList';
import { DeviceDetails } from './components/DeviceDetails';
import { ConnectionModal } from './components/ConnectionModal';
import { useDeviceStore } from './store/deviceStore';
import { Wifi } from 'lucide-react';

function App() {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const { connection, devices } = useDeviceStore();
  
  // Show connection modal on first load if not connected and no devices
  useEffect(() => {
    if (!connection.isConnected && devices.length === 0) {
      const timer = setTimeout(() => setShowConnectionModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenSettings={() => setShowConnectionModal(true)} />
      
      {/* Connection Banner */}
      {!connection.isConnected && devices.length === 0 && (
        <div className="bg-accent-amber/10 border-b border-accent-amber/30 px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-accent-amber">
            <Wifi size={18} />
            <span className="text-sm font-medium">
              Nenhum Gateway conectado.
            </span>
            <button 
              onClick={() => setShowConnectionModal(true)}
              className="text-sm underline hover:no-underline"
            >
              Conectar agora
            </button>
          </div>
        </div>
      )}
      
      <main className="flex-1 flex">
        <DeviceList />
      </main>
      
      <DeviceDetails />
      
      <ConnectionModal 
        isOpen={showConnectionModal} 
        onClose={() => setShowConnectionModal(false)} 
      />
    </div>
  );
}

export default App;
