import React, { useState, useRef, useEffect } from 'react';
import { Home, Wrench, Users, BarChart2, Settings, Truck, Clock, Package, LogOut, CheckCircle, Archive as ArchiveIcon, MessageCircle, Megaphone, Search, ChevronDown, X, Recycle, ClipboardList } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { hasPermission, ROLES, ROLE_DISPLAY_NAMES } from '../utils/permissions';
import MyPhoneIcon from './LocalIcons';
import NotificationCenter from './NotificationCenter';
import RepairHistoryModal from './RepairHistoryModal';

const TopNav = ({ activeTab, setActiveTab }) => {
    const { logout, currentUser, alerts, searchQuery, setSearchQuery, repairs } = useAppContext();

    const CATEGORIES = [
        {
            id: 'servis',
            label: 'Servis',
            items: [
                { id: 'service', icon: MyPhoneIcon, label: 'Servis Kabul' },
                { id: 'pending-repairs', icon: Clock, label: 'İşlem Bekleyenler' },
                { id: 'approval-pending', icon: MessageCircle, label: 'Onay Bekleyenler' }
            ]
        },
        {
            id: 'merkez',
            label: 'Operasyon',
            items: [
                { id: 'in-store', icon: Wrench, label: 'Mağaza İçi Onarım' },
                { id: 'apple-center', icon: Truck, label: 'Apple Merkezi' },
                { id: 'ready-pickup', icon: CheckCircle, label: 'Teslimat Havuzu' },
                { id: 'archive', icon: ArchiveIcon, label: 'Arşiv' }
            ]
        },
        {
            id: 'musteri',
            label: 'Müşteri',
            items: [
                { id: 'customers', icon: Users, label: 'Müşteri Yönetimi' },
                { id: 'marketing', icon: Megaphone, label: 'Otomasyon & Pazarlama' }
            ]
        },
        {
            id: 'stok_rapor',
            label: 'Envanter',
            items: [
                { id: 'stock', icon: Package, label: 'Stok Yönetimi' }
            ]
        },
        {
            id: 'yonetim',
            label: 'Yönetim',
            items: [
                { id: 'technicians', icon: Users, label: 'Teknisyenler' },
                { id: 'store-operations', icon: Home, label: 'Operasyon Şeması' },
                { id: 'store-management', icon: ClipboardList, label: 'Mağaza İçi Yönetim' },
                { id: 'reports', icon: BarChart2, label: 'Raporlar' },
                ...(hasPermission(currentUser, 'manage_settings') ? [{ id: 'settings', icon: Settings, label: 'Sistem Ayarları' }] : [])
            ]
        }
    ];

    const filteredCategories = CATEGORIES.map(category => {
        const filteredItems = category.items.filter(item => {
            if (item.id === 'settings') {
                return hasPermission(currentUser, 'manage_settings');
            }
            if (['technicians', 'store-operations', 'reports'].includes(item.id)) {
                const role = currentUser?.role?.toLowerCase();
                return ['superadmin', 'admin', 'yonetici', 'storemanager'].includes(role);
            }
            return true;
        });

        return {
            ...category,
            items: filteredItems
        };
    }).filter(category => category.items.length > 0);

    const [hoveredCategory, setHoveredCategory] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectedSearchRepair, setSelectedSearchRepair] = useState(null);
    const searchRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Compute matching repairs for the dropdown
    const searchResults = searchQuery.trim().length >= 1
        ? repairs.filter(r =>
            r.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.device?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.serial?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Beklemede': return 'bg-gray-100 text-gray-600';
            case 'İşlemde': return 'bg-blue-100 text-blue-700';
            case 'Parça Bekleniyor': return 'bg-orange-100 text-orange-700';
            case 'Cihaz Hazır': return 'bg-green-100 text-green-700';
            case 'Teslim Edildi': return 'bg-purple-100 text-purple-700';
            case 'Müşteri Onayı Bekliyor': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const handleResultClick = (repair) => {
        setSelectedSearchRepair(repair);
        setSearchOpen(false);
        setSearchQuery('');
    };

    return (
        <>
            <div className="w-full fixed top-0 left-0 z-50">
            {/* Unified Top Navigation Bar */}
            <div className="h-16 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">

                {/* Left: Logo & Navigation Combined */}
                <div className="flex items-center gap-8">
                    {/* OSS Logo - Ana Sayfaya git */}
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className="flex items-center hover:opacity-70 transition-opacity active:scale-95"
                        title="Ana Sayfa"
                    >
                        <span className="text-xl font-black tracking-tighter text-[#1d1d1f] select-none">OSS</span>
                    </button>

                    {/* Categorized Navigation */}
                    <div className="flex items-center gap-1">
                        {filteredCategories.map(category => {
                            const isCategoryActive = category.items.some(item => item.id === activeTab);
                            const isHovered = hoveredCategory === category.id;

                            return (
                                <div
                                    key={category.id}
                                    className="relative"
                                    onMouseEnter={() => setHoveredCategory(category.id)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                >
                                    <button
                                        onClick={() => {
                                            if (category.id === 'dashboard') {
                                                setActiveTab('dashboard');
                                                setHoveredCategory(null);
                                            } else if (category.items.length === 1) {
                                                setActiveTab(category.items[0].id);
                                                setHoveredCategory(null);
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5
                                            ${isCategoryActive ? 'text-apple-blue bg-apple-blue/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'}
                                        `}>
                                        {category.label}
                                        {category.items.length > 1 && category.id !== 'dashboard' && (
                                            <ChevronDown
                                                size={12}
                                                className={`opacity-50 transition-transform ${isHovered ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </button>

                                    {/* Dropdown Menu */}
                                    {category.items.length > 1 && (
                                        <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-2 transition-all duration-200 z-50 
                                            ${isHovered ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-1 invisible'}
                                        `}>
                                            <div className="bg-white/95 backdrop-blur-xl border border-gray-100 shadow-xl rounded-xl p-1.5 w-56 flex flex-col gap-0.5">
                                                {category.items.map(item => {
                                                    const isActive = activeTab === item.id;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => {
                                                                setActiveTab(item.id);
                                                                setHoveredCategory(null); // Tıklanınca kapat
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-colors
                                                                ${isActive ? 'bg-[#f5f5f7] text-apple-blue' : 'text-gray-600 hover:bg-[#f5f5f7] hover:text-gray-900'}
                                                            `}
                                                        >
                                                            <item.icon size={16} className={isActive ? 'text-apple-blue' : 'text-gray-400'} />
                                                            {item.label}
                                                            {item.id === 'pending-repairs' && alerts.length > 0 && (
                                                                <span className="ml-auto w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-apple-red text-white">
                                                                    {alerts.length}
                                                                </span>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right: Search & User Info */}
                <div className="flex items-center gap-6">
                    {/* Search with live dropdown */}
                    <div ref={searchRef} className="relative w-64 hidden lg:block">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Kayıt veya müşteri ara..."
                            className="w-full pl-9 pr-8 py-1.5 text-xs font-medium border border-gray-200 rounded-md bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-all"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchOpen(true);
                            }}
                            onFocus={() => setSearchOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                }
                                if (e.key === 'Enter' && searchResults.length > 0) {
                                    handleResultClick(searchResults[0]);
                                }
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}

                        {/* Dropdown results panel */}
                        {searchOpen && searchResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-xl shadow-2xl shadow-black/10 z-[200] overflow-hidden">
                                {/* Scrollable list — max 3 items tall */}
                                <div
                                    className="overflow-y-auto"
                                    style={{ maxHeight: `${3 * 64}px` }}
                                >
                                    {searchResults.map((repair) => (
                                        <button
                                            key={repair.id}
                                            onClick={() => handleResultClick(repair)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 text-left"
                                        >
                                            {/* Repair ID badge */}
                                            <span className="shrink-0 text-[9px] font-black font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                #{repair.id}
                                            </span>
                                            {/* Device + Customer */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-900 truncate">{repair.device}</p>
                                                <p className="text-[10px] text-gray-400 font-medium truncate">{repair.customer}</p>
                                            </div>
                                            {/* Status badge */}
                                            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${getStatusColor(repair.status)}`}>
                                                {repair.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {/* Footer count */}
                                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {searchResults.length} sonuç bulundu
                                    </span>
                                    <span className="text-[10px] text-gray-300 font-medium">
                                        ↵ ilkine git &nbsp;·&nbsp; Esc kapat
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* No results message */}
                        {searchOpen && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-xl shadow-2xl shadow-black/10 z-[200] px-4 py-5 text-center">
                                <p className="text-xs font-semibold text-gray-400">Eşleşen kayıt bulunamadı</p>
                                <p className="text-[10px] text-gray-300 mt-0.5">&ldquo;{searchQuery}&rdquo; için sonuç yok</p>
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-gray-200 hidden lg:block"></div>

                    <NotificationCenter onSelectRepair={(repair) => setSelectedSearchRepair(repair)} />

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-semibold text-gray-900 leading-none">{currentUser?.name || 'Kullanıcı'}</div>
                            <div className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-widest">{ROLE_DISPLAY_NAMES[currentUser?.role?.toLowerCase()] || currentUser?.role}</div>
                        </div>
                        <button
                            onClick={logout}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors border border-gray-200"
                            title="Çıkış Yap"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>

            </div>
            </div>

            {/* Search Result Detail Modal */}
            {selectedSearchRepair && (
                <RepairHistoryModal
                    repair={selectedSearchRepair}
                    onClose={() => setSelectedSearchRepair(null)}
                />
            )}
        </>
    );
};


export default TopNav;
