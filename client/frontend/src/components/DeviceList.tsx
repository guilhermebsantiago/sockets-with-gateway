import { useDeviceStore } from '../store/deviceStore';
import { DeviceCard } from './DeviceCard';
import { Cpu } from 'lucide-react';
import { useState } from 'react';
import type { DeviceType } from '../types/device';

const filterOptions: { value: DeviceType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'camera', label: 'Câmeras' },
  { value: 'traffic_light', label: 'Semáforos' },
  { value: 'street_lamp', label: 'Postes' },
  { value: 'air_quality_sensor', label: 'Qualidade do Ar' },
  { value: 'temperature_sensor', label: 'Temperatura' },
];

export function DeviceList() {
  const { devices } = useDeviceStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DeviceType | 'all'>('all');
  
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(search.toLowerCase()) ||
                          device.ip.includes(search);
    const matchesFilter = filter === 'all' || device.type === filter;
    return matchesSearch && matchesFilter;
  });
  
  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar dispositivo por nome ou IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:flex-1 px-4 py-3 bg-primary-200 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all"
        />
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as DeviceType | 'all')}
          className="w-full md:w-auto md:min-w-[180px] px-4 py-3 bg-primary-200 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all cursor-pointer"
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Device Grid */}
      {filteredDevices.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredDevices.map((device, index) => (
            <DeviceCard key={device.id} device={device} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <Cpu size={40} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            Nenhum dispositivo encontrado
          </h3>
          <p className="text-slate-500 max-w-md">
            {devices.length === 0 
              ? 'Aguardando conexão com o Gateway para descobrir dispositivos na rede.'
              : 'Nenhum dispositivo corresponde aos filtros selecionados.'}
          </p>
        </div>
      )}
    </div>
  );
}
