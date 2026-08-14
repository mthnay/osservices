import { Home, Wrench, Users, BarChart2, Settings, Truck, Clock, Package, LogOut, CheckCircle, Archive as ArchiveIcon, MessageCircle, Megaphone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { hasPermission, ROLE_DISPLAY_NAMES } from '../utils/permissions';
import { MODULE_MENU } from '../utils/moduleAccess';
import MyPhoneIcon from './LocalIcons';

const MENU_ICONS = {
    dashboard: Home,
    service: MyPhoneIcon,
    'pending-repairs': Clock,
    'approval-pending': MessageCircle,
    customers: Users,
    marketing: Megaphone,
    stock: Package,
    'in-store': Wrench,
    'ready-pickup': CheckCircle,
    archive: ArchiveIcon,
    'apple-center': Truck,
    technicians: Users,
    reports: BarChart2,
    settings: Settings,
};

const Sidebar = ({ activeTab, setActiveTab }) => {
    const { logout, currentUser, selectedStoreId, setSelectedStoreId, servicePoints, alerts } = useAppContext();

    // Her modül bir yetkiye bağlıdır; yetkisi olmayan menüyü hiç görmez.
    // Eşleşme tablosu App.jsx ile ortaktır (bkz. utils/moduleAccess).
    const menuItems = MODULE_MENU
        .filter(item => hasPermission(currentUser, item.permission))
        .map(item => ({ ...item, icon: MENU_ICONS[item.id] }));

    return (
        <div className="h-screen w-72 glass flex flex-col fixed left-0 top-0 z-50 border-r border-white/40 shadow-2xl transition-all duration-300 backdrop-blur-3xl bg-white/70">
            {/* Header */}
            <div className="p-8 pb-6">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-md flex items-center justify-center text-white font-semibold text-2xl shadow-lg shadow-gray-300 ring-2 ring-white/50">
                        T
                    </div>
                    <div>
                        <h1 className="font-semibold text-gray-900 text-2xl tracking-tighter leading-none">Troy</h1>
                        <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[10px] text-blue-600 font-bold tracking-widest uppercase bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100 w-fit">Servis Portalı</p>

                            {/* Dynamic Store Info */}
                            <div className="mt-1 flex flex-col bg-white/50 p-1.5 rounded-lg border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-900 truncate">
                                    {Number(selectedStoreId) === 0 && hasPermission(currentUser, 'view_all_stores')
                                        ? 'Tüm Mağazalar'
                                        : (servicePoints.find(p => Number(p.id) === Number(selectedStoreId || currentUser?.storeId))?.name || 'Mağaza Seçilmedi')}
                                </span>
                                <span className="text-[9px] font-semibold text-blue-600">
                                    Ship-To: {servicePoints.find(p => Number(p.id) === Number(selectedStoreId || currentUser?.storeId))?.shipTo || '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar py-2 mask-linear-fade">
                {/* Admin Context Selector */}
                {hasPermission(currentUser, 'view_all_stores') && (
                    <div className="mb-8 px-2">
                        <label className="text-[10px] font-semibold text-xs uppercase tracking-wide text-gray-400 mb-3 block px-1">Görünüm Değiştir</label>
                        <div className="relative group">
                            <select
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                                className="w-full bg-white/60 backdrop-blur-md border border-gray-200/60 rounded-md px-4 py-3.5 text-xs font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white hover:shadow-md hover:-translate-y-0.5"
                            >
                                <option value={0}>Tüm Mağazalar</option>
                                {servicePoints.map(point => (
                                    <option key={point.id} value={point.id}>{point.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                <label className="text-[10px] font-semibold text-xs uppercase tracking-wide text-gray-400 mb-2 block px-3 mt-4">Menü</label>

                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-md transition-all duration-300 group relative overflow-hidden ${isActive
                                ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-200 scale-[1.02]'
                                : 'text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-md'
                                }`}
                        >
                            <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'text-blue-400 scale-110' : 'text-gray-400 group-hover:scale-110 group-hover:text-gray-600'}`} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-sm tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>

                            {/* Notification Badge for Pending Repairs */}
                            {item.id === 'pending-repairs' && alerts.length > 0 && (
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[10px] font-semibold rounded-full shadow-lg ${
                                    alerts.some(a => a.type === 'critical') 
                                    ? 'bg-red-500 text-white animate-pulse' 
                                    : 'bg-orange-500 text-white'
                                }`}>
                                    {alerts.length}
                                </span>
                            )}

                            {/* Shiny effect for active item */}
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 mx-4 mb-4 mt-2 bg-white/40 backdrop-blur-md rounded-lg border border-white/50 shadow-lg">
                <div className="flex items-center gap-3 mb-4 p-1">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white">
                        {currentUser?.avatar || 'TR'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{currentUser?.name || 'Kullanıcı'}</h4>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider truncate bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {ROLE_DISPLAY_NAMES[currentUser?.role?.toLowerCase()] || currentUser?.role}
                        </p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-bold transition-all border border-gray-100 shadow-sm hover:shadow active:scale-95 group"
                >
                    <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Güvenli Çıkış
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
