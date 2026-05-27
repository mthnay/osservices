import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, LayoutGrid } from 'lucide-react';
import TopNav from './components/TopNav';
import Dashboard from './components/Dashboard';
import ServiceAcceptance from './components/ServiceAcceptance';
import RepairCenter from './components/RepairCenter';
import PendingRepairs from './components/PendingRepairs';
import KBBManagement from './components/KBBManagement';
import Reports from './components/Reports';
import Technicians from './components/Technicians';
import Settings from './components/Settings';
import StoreOperations from './components/StoreOperations';
import StoreManagement from './components/StoreManagement';
import ReadyForPickup from './components/ReadyForPickup';
import Archive from './components/Archive';
import ApprovalPending from './components/ApprovalPending';
import Customers from './components/Customers';
import Login from './components/Login';
import CustomerPortal from './components/CustomerPortal';
import TrackingInput from './components/TrackingInput';
import MarketingAutomation from './components/MarketingAutomation';
import StockManagement from './components/StockManagement';
import { useAppContext } from './context/AppContext';
import { hasPermission } from './utils/permissions';

function App() {
  const { currentUser, servicePoints, visibleServicePoints, selectedStoreId, setSelectedStoreId } = useAppContext();
  const role = currentUser?.role?.toLowerCase();
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('oss_active_tab') || 'dashboard');

  useEffect(() => {
    sessionStorage.setItem('oss_active_tab', activeTab);
  }, [activeTab]);

  const [showStoreSelect, setShowStoreSelect] = useState(false);
  const storeSelectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (storeSelectRef.current && !storeSelectRef.current.contains(event.target)) {
        setShowStoreSelect(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Kullanıcı giriş yaptığında veya değiştiğinde, seçili mağazayı güncelle
  useEffect(() => {
    if (!currentUser) return;
    const isPrivileged = role === 'superadmin' || role === 'admin' || role === 'yonetici';

    // Normal kullanıcılar için (SuperAdmin/Yönetici olmayanlar) kendi mağazasını otomatik seç
    if (!isPrivileged && currentUser.storeId && selectedStoreId === 0) {
      setSelectedStoreId(currentUser.storeId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, servicePoints]);
  const [serviceInitialData, setServiceInitialData] = useState(null);
  const [trackingMode, setTrackingMode] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const trackIdFromUrl = urlParams.get('track');

  if (!currentUser) {
    if (trackIdFromUrl) {
      return <CustomerPortal trackId={trackIdFromUrl} />;
    }

    if (trackingMode) {
      return <TrackingInput onSelectTrack={(id) => {
        window.history.pushState({}, '', `?track=${id}`);
        window.location.reload(); // Reload to trigger trackId logic
      }} />;
    }

    return <Login onTrackingClick={() => setTrackingMode(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col font-sans text-[#1d1d1f]">
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 w-full pt-20 pb-20 px-6 transition-all duration-300 relative">
        <div className="max-w-[1200px] mx-auto">
          {/* Top Header with Notifications removed */}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'service' && <ServiceAcceptance setActiveTab={setActiveTab} initialData={serviceInitialData} clearInitialData={() => setServiceInitialData(null)} />}
          {activeTab === 'pending-repairs' && <PendingRepairs setActiveTab={setActiveTab} />}
          {activeTab === 'approval-pending' && <ApprovalPending setActiveTab={setActiveTab} />}
          {activeTab === 'customers' && <Customers setActiveTab={setActiveTab} setServiceInitialData={setServiceInitialData} />}
          {activeTab === 'marketing' && <MarketingAutomation />}
          {activeTab === 'stock' && <StockManagement />}
          {activeTab === 'in-store' && <RepairCenter type="in-store" setActiveTab={setActiveTab} />}
          {activeTab === 'ready-pickup' && <ReadyForPickup />}
          {activeTab === 'archive' && <Archive />}
          {activeTab === 'apple-center' && <RepairCenter type="apple-center" setActiveTab={setActiveTab} />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'technicians' && <Technicians />}
          {activeTab === 'store-operations' && <StoreOperations />}
          {activeTab === 'store-management' && <StoreManagement />}
          {activeTab === 'settings' && hasPermission(currentUser, 'manage_settings') && <Settings />}
          {activeTab !== 'dashboard' && activeTab !== 'service' && activeTab !== 'in-store' && activeTab !== 'ready-pickup' && activeTab !== 'archive' && activeTab !== 'apple-center' && activeTab !== 'pending-repairs' && activeTab !== 'approval-pending' && activeTab !== 'stock' && activeTab !== 'reports' && activeTab !== 'technicians' && activeTab !== 'store-operations' && activeTab !== 'store-management' && activeTab !== 'settings' && activeTab !== 'customers' && activeTab !== 'marketing' && (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
              <h2 className="text-2xl font-bold text-gray-400 mb-2">Sayfa Yapım Aşamasında</h2>
              <p className="text-gray-500">Bu modül henüz aktifleştirilmedi.</p>
            </div>
          )}
        </div>
      </main>

      {/* Unified Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full h-9 bg-white/90 backdrop-blur-md border-t border-black/5 flex items-center justify-between px-6 z-50 shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Aktif Mağaza:</span>
          
          {hasPermission(currentUser, 'view_all_stores') && !['technician', 'reception', 'teknisyen', 'storemanager', 'servis_sorumlusu', 'servissorumlusu'].includes(currentUser?.role?.toLowerCase()) ? (
            <div className="relative" ref={storeSelectRef}>
              <button
                onClick={() => setShowStoreSelect(!showStoreSelect)}
                className={`flex items-center gap-2 px-2 h-6 rounded border transition-all
                            ${showStoreSelect ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'}
                        `}
              >
                <MapPin size={10} className={showStoreSelect ? 'text-white' : 'text-blue-500'} />
                <span className="text-[11px] font-bold">
                  {selectedStoreId === 0 ? 'Tüm Mağazalar' : servicePoints.find(p => p.id === selectedStoreId)?.name || 'Mağaza Seç'}
                </span>
                <ChevronDown size={10} className={`transition-transform ${showStoreSelect ? 'rotate-180' : 'opacity-50'}`} />
              </button>

              {showStoreSelect && (
                <div className="absolute bottom-full left-0 mb-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-xl p-1 w-64 z-[100] animate-in fade-in slide-in-from-bottom-2">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mağaza Değiştir</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {/* All Stores option - only for true admins who are not staff */}
                    {(role === 'superadmin' || role === 'admin' || role === 'yonetici') && (
                      <button
                        onClick={() => { setSelectedStoreId(0); setShowStoreSelect(false); }}
                        className={`w-full px-5 py-4 text-left flex items-center justify-between border-b border-gray-50 transition-colors ${selectedStoreId === 0 ? 'bg-blue-50/50 text-blue-600 font-bold' : 'text-gray-600 font-medium hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedStoreId === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            <LayoutGrid size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px]">Tüm Mağazalar</span>
                            <span className="text-[10px] opacity-60">Genel görünüm</span>
                          </div>
                        </div>
                        {selectedStoreId === 0 && <Check size={16} strokeWidth={3} />}
                      </button>
                    )}

                    {visibleServicePoints.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => { setSelectedStoreId(Number(store.id)); setShowStoreSelect(false); }}
                        className={`w-full px-5 py-4 text-left flex items-center justify-between transition-colors ${Number(selectedStoreId) === Number(store.id) ? 'bg-blue-50/50 text-blue-600 font-bold' : 'text-gray-600 font-medium hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${Number(selectedStoreId) === Number(store.id) ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            <MapPin size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px]">{store.name}</span>
                            <span className="text-[10px] opacity-60">Ship-To: {store.shipTo}</span>
                          </div>
                        </div>
                        {Number(selectedStoreId) === Number(store.id) && <Check size={16} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 h-6 rounded border bg-blue-50 border-blue-100">
              <MapPin size={10} className="text-blue-500" />
              <span className="text-[11px] font-bold text-blue-700">
                {servicePoints.find(p => p.id === currentUser?.storeId)?.name || 'Mağazanız'}
              </span>
            </div>
          )}
        </div>
        <div className="text-[10px] font-medium text-gray-400 tracking-tight">
          OSS Operating Software Solution - 2026 Tüm Hakları Saklıdır
        </div>
      </div>
    </div>
  );
}

export default App;
