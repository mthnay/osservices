import React, { useState, useMemo, useEffect } from 'react';
import { 
    Package, Search, Plus, Filter, ArrowUpRight, ArrowDownRight, 
    Tag, Recycle, Box, Clock, AlertCircle, Truck, CheckCircle, 
    Trash2, Edit3, X, ChevronRight, ArrowRightLeft, ChevronDown, 
    Check, AlertTriangle, Layers, MapPin, MoreHorizontal
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { hasPermission, ROLES } from '../utils/permissions';
import { appConfirm, appPrompt } from '../utils/alert';
import MyPhoneIcon from './LocalIcons';

const StockManagement = () => {
    const { 
        inventory, addInventoryItem, updateInventoryItem, removeInventoryItem, 
        servicePoints, visibleServicePoints, currentUser, showToast, selectedStoreId, setSelectedStoreId,
        repairs, updateRepair
    } = useAppContext();

    // Role-based access
    const isManager = (() => {
        const role = currentUser?.role?.toLowerCase();
        return role === ROLES.SUPER_ADMIN || role === ROLES.STORE_MANAGER || role === 'admin';
    })();

    // Unified Tab State: 'inventory' or 'kbb'
    const [activeMainTab, setActiveMainTab] = useState('inventory');
    
    // KBB Specific Tab State
    const [activeKbbTab, setActiveKbbTab] = useState('stocks'); // 'stocks', 'loaners', 'returns'
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [warehouseType, setWarehouseType] = useState('KGB'); 
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPartDetails, setSelectedPartDetails] = useState(null);
    const [transferPart, setTransferPart] = useState(null);
    
    const [newPart, setNewPart] = useState({ name: '', partNumber: '', kgbSerial: '', category: 'iPhone', storeId: selectedStoreId || (currentUser?.storeId || ''), quantity: 1, minLevel: 5, warehouseType: 'KGB' });

    // KBB Specific State
    const [selectedItems, setSelectedItems] = useState([]);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnCode, setReturnCode] = useState('');
    const [editingSerialIdx, setEditingSerialIdx] = useState(-1);
    const [editingSerialVal, setEditingSerialVal] = useState('');
    const [showEditSerialModal, setShowEditSerialModal] = useState(false);
    const [currentSerial, setCurrentSerial] = useState('');
    const [serialList, setSerialList] = useState([]);
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    const [showKbbAddModal, setShowKbbAddModal] = useState(false);

    // --- KBB Helpers ---
    const getDaysLeft = (dateStr) => {
        if (!dateStr) return 0;
        const [day, month, year] = dateStr.split(' ')[0].split('.');
        if (!day || !month || !year) return 0;
        const target = new Date(year, month - 1, day);
        target.setDate(target.getDate() + 90); 
        return Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
    };

    const getShipTo = (sId) => servicePoints.find(p => p.id === sId)?.shipTo || '-';

    // KBB List Logic
    const kbbList = useMemo(() => {
        const baseRepairs = selectedStoreId === 0 ? repairs : repairs.filter(r => String(r.storeId) === String(selectedStoreId));
        return baseRepairs.flatMap(repair =>
            (repair.parts || []).map((part, index) => ({
                ...part,
                uniqueId: `${repair.id}-${index}`,
                repairId: repair.id,
                storeId: repair.storeId,
                repairTarih: repair.date,
                customer: repair.customer,
                partIndex: index,
                kbbStatus: part.kbbStatus || 'Bekliyor',
                returnCode: part.returnCode || ''
            }))
        ).filter(item => item.kbbStatus !== 'Returned');
    }, [repairs, selectedStoreId]);

    const filteredKbbItems = useMemo(() => {
        return kbbList.filter(item =>
            (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.repairId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.partNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [kbbList, searchTerm]);

    // General Inventory Logic
    const filteredParts = inventory.filter(part => {
        const matchesSearch = 
            part.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (part.partNumber && part.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (part.id && part.id.toString().includes(searchTerm));
        const matchesCategory = activeCategory === 'all' || part.category === activeCategory;
        const matchesStore = selectedStoreId === 0 || String(part.storeId) === String(selectedStoreId);
        const matchesWarehouse = part.warehouseType === warehouseType || (!part.warehouseType && warehouseType === 'KGB');
        return matchesSearch && matchesCategory && matchesStore && matchesWarehouse;
    });

    const totalItems = filteredParts.length;
    const lowStockItems = filteredParts.filter(p => p.quantity < p.minLevel).length;
    const totalValue = filteredParts.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(filteredKbbItems.map(i => i.uniqueId));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (id) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(i => i !== id));
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    };

    const handleBulkReturn = async () => {
        if (!returnCode) {
            showToast('Lütfen İade Talep Kodu giriniz.', 'warning');
            return;
        }
        const itemsToReturn = kbbList.filter(item => selectedItems.includes(item.uniqueId));
        const repairsToUpdate = {};
        itemsToReturn.forEach(item => {
            if (!repairsToUpdate[item.repairId]) repairsToUpdate[item.repairId] = [];
            repairsToUpdate[item.repairId].push(item);
        });
        for (const [repairId, items] of Object.entries(repairsToUpdate)) {
            const repair = repairs.find(r => r.id === repairId);
            if (!repair) continue;
            const updatedParts = [...repair.parts];
            items.forEach(item => {
                updatedParts[item.partIndex] = {
                    ...updatedParts[item.partIndex],
                    kbbStatus: 'Returned',
                    returnCode: returnCode,
                    returnTarih: new Date().toLocaleString('tr-TR')
                };
            });
            await updateRepair(repairId, { parts: updatedParts });
        }
        showToast(`${itemsToReturn.length} parça başarıyla iade edildi.`, 'success');
        setShowReturnModal(false);
        setReturnCode('');
        setSelectedItems([]);
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-24 animate-fade-in font-sans">
            {/* Unified Top Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200/60 mt-4 px-2">
                <div>
                    <h1 className="text-[34px] font-semibold text-gray-900 tracking-tight leading-none mb-2">Stok Yönetimi</h1>
                    <p className="text-[15px] text-gray-500">Genel envanter ve Apple iade süreçlerini tek ekrandan yönetin.</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50 backdrop-blur-md">
                        <button 
                            onClick={() => { setActiveMainTab('inventory'); setSearchTerm(''); }}
                            className={`px-6 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center gap-2 ${activeMainTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Package size={16} /> Genel Stok
                        </button>
                        <button 
                            onClick={() => { setActiveMainTab('kbb'); setSearchTerm(''); }}
                            className={`px-6 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center gap-2 ${activeMainTab === 'kbb' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Recycle size={16} /> Apple İade / KBB
                        </button>
                    </div>

                    {hasPermission(currentUser, 'view_all_stores') && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowStoreDropdown(!showStoreDropdown)}
                                className="h-10 px-4 bg-white border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm group"
                            >
                                <Filter size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-[13px] font-medium text-gray-700">
                                    {selectedStoreId === 0 ? 'Tüm Mağazalar' : (servicePoints.find(s => String(s.id) === String(selectedStoreId))?.name || 'Mağaza')}
                                </span>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showStoreDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowStoreDropdown(false)}></div>
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                                        {hasPermission(currentUser, 'view_all_stores') && !['technician', 'reception', 'teknisyen', 'storemanager'].includes(currentUser?.role?.toLowerCase()) && (
                                            <>
                                                <button 
                                                    onClick={() => { setSelectedStoreId(0); setShowStoreDropdown(false); }}
                                                    className={`w-full px-4 py-2 text-left text-[13px] flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedStoreId === 0 ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-600 font-medium'}`}
                                                >
                                                    Tüm Mağazalar
                                                    {selectedStoreId === 0 && <Check size={14} />}
                                                </button>
                                                <div className="h-px bg-gray-100 my-1"></div>
                                            </>
                                        )}
                                        {visibleServicePoints.map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => { setSelectedStoreId(parseInt(s.id)); setShowStoreDropdown(false); }}
                                                className={`w-full px-4 py-2 text-left text-[13px] flex items-center justify-between hover:bg-gray-50 transition-colors ${String(selectedStoreId) === String(s.id) ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-600 font-medium'}`}
                                            >
                                                {s.name}
                                                {String(selectedStoreId) === String(s.id) && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {activeMainTab === 'inventory' ? (
                <>
                    {/* General Stock View */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex bg-gray-100/80 p-1 rounded-lg border border-gray-200/50 backdrop-blur-md">
                            <button 
                                onClick={() => setWarehouseType('KGB')}
                                className={`px-5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 ${warehouseType === 'KGB' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                KGB (Yeni Parça)
                            </button>
                            <button 
                                onClick={() => setWarehouseType('KBB')}
                                className={`px-5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 ${warehouseType === 'KBB' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                KBB (İade / İkinci El)
                            </button>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Envanterde ara..."
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-200 flex-shrink-0"
                            >
                                <Plus size={18} /> Parça Ekle
                            </button>
                        </div>
                    </div>



                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Toplam Parça', value: totalItems, subtitle: 'Envanterdeki parçalar', icon: Package, color: 'text-gray-900' },
                            { label: 'Kritik Stok', value: lowStockItems, subtitle: 'Tedarik gerekenler', icon: AlertTriangle, color: lowStockItems > 0 ? 'text-red-500' : 'text-gray-900' },
                            { label: 'Envanter Değeri', value: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalValue), subtitle: 'Genel tutar', icon: Tag, color: 'text-gray-900' }
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50">
                                        <stat.icon size={18} className="text-gray-600" />
                                    </div>
                                </div>
                                <h3 className={`text-3xl font-bold ${stat.color} tracking-tight`}>{stat.value}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
                                <p className="text-[11px] text-gray-400 mt-2 font-medium">{stat.subtitle}</p>
                            </div>
                        ))}
                    </div>

                    {/* Inventory Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Parça Bilgisi</th>
                                    <th className="px-6 py-4">P/N Kodu</th>
                                    {selectedStoreId === 0 && <th className="px-6 py-4">Şube</th>}
                                    <th className="px-6 py-4 text-center">Stok Adedi</th>
                                    <th className="px-6 py-4 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredParts.map((item) => (
                                    <tr key={item._id || item.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                    <Package size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                    <p className="text-[11px] text-gray-400 font-medium">{item.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[12px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">{item.partNumber || '-'}</span>
                                        </td>
                                        {selectedStoreId === 0 && (
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                    {servicePoints.find(s => String(s.id) === String(item.storeId))?.name || 'Genel'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                <span className={`text-[15px] font-bold w-12 text-center ${item.quantity < item.minLevel ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>{item.quantity}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => setSelectedPartDetails(item)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <>
                    {/* Apple KBB View */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50 backdrop-blur-md">
                            <button
                                onClick={() => setActiveKbbTab('stocks')}
                                className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${activeKbbTab === 'stocks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                KBB Stokları
                            </button>
                            <button
                                onClick={() => setActiveKbbTab('returns')}
                                className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${activeKbbTab === 'returns' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                İade Havuzu
                            </button>
                            <button
                                onClick={() => setActiveKbbTab('loaners')}
                                className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${activeKbbTab === 'loaners' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Ödünç Cihazlar
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {activeKbbTab === 'returns' && selectedItems.length > 0 && (
                                <button
                                    onClick={() => setShowReturnModal(true)}
                                    className="bg-indigo-600 text-white h-10 px-6 rounded-xl text-[13px] font-bold shadow-lg shadow-indigo-100 animate-in zoom-in"
                                >
                                    Toplu İade ({selectedItems.length})
                                </button>
                            )}
                            <button
                                onClick={() => setShowKbbAddModal(true)}
                                className="bg-white border border-gray-200 text-indigo-600 h-10 px-6 rounded-xl text-[13px] font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                            >
                                <Plus size={18} /> Yeni KBB Girişi
                            </button>
                        </div>
                    </div>

                    {activeKbbTab === 'returns' ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">
                                            <input type="checkbox" onChange={handleSelectAll} checked={selectedItems.length === filteredKbbItems.length && filteredKbbItems.length > 0} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                                        </th>
                                        <th className="px-6 py-4">Geri Gönderilecek Parça</th>
                                        <th className="px-6 py-4">Servis / Müşteri</th>
                                        <th className="px-6 py-4 text-center">Kalan Gün</th>
                                        <th className="px-6 py-4 text-center">Durum</th>
                                        <th className="px-6 py-4 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredKbbItems.map(item => (
                                        <tr key={item.uniqueId} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <input type="checkbox" checked={selectedItems.includes(item.uniqueId)} onChange={() => handleSelectItem(item.uniqueId)} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">{item.partNumber}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit mb-1">#{item.repairId}</p>
                                                <p className="text-xs font-medium text-gray-500">{item.customer}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[12px] font-bold ${getDaysLeft(item.repairTarih) < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {getDaysLeft(item.repairTarih)} Gün
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-orange-200 uppercase tracking-wide`}>
                                                    {item.kbbStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={async () => {
                                                        const tracking = await appPrompt('UPS Takip No Giriniz:');
                                                        if (tracking) {
                                                            const repair = repairs.find(r => r.id === item.repairId);
                                                            const updatedParts = [...repair.parts];
                                                            updatedParts[item.partIndex] = { ...updatedParts[item.partIndex], kbbStatus: 'Shipped', trackingNo: tracking };
                                                            updateRepair(item.repairId, { parts: updatedParts });
                                                        }
                                                    }}
                                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Truck size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : activeKbbTab === 'stocks' ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Parça Bilgisi</th>
                                        <th className="px-6 py-4">P/N Kodu</th>
                                        <th className="px-6 py-4 text-center">Stok Adedi</th>
                                        <th className="px-6 py-4 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {inventory.filter(i => i.warehouseType === 'KBB' || (i.category === 'parts' && (selectedStoreId === 0 || String(i.storeId) === String(selectedStoreId)))).map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedStockItem(item)}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                        <Box size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                        <p className="text-[11px] text-gray-400 font-medium">Apple KBB Stok</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500 uppercase">{item.partNumber || '-'}</td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-900">{item.quantity} Adet</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><ChevronRight size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {inventory.filter(i => i.category === 'loaner' && (selectedStoreId === 0 || String(i.storeId) === String(selectedStoreId))).map((item) => (
                                <div key={item.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
                                     <div className="flex justify-between items-start mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.currentCustomer ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            <MyPhoneIcon size={22} />
                                        </div>
                                        {!item.currentCustomer && <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">Müsait</span>}
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-1">{item.name}</h4>
                                    <p className="text-[10px] font-mono text-gray-400 font-bold uppercase">S/N: {item.serialNumber}</p>
                                    {item.currentCustomer && (
                                        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                            <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">Müşteri</p>
                                            <p className="text-xs font-bold text-purple-900">{item.currentCustomer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modals section */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-scale-up">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Toplu İade İşlemi</h3>
                        <p className="text-sm text-gray-500 mb-6">Seçilen {selectedItems.length} parça için İade Talep Kodu giriniz.</p>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-6 font-bold focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Örn: RMA-12345"
                            value={returnCode}
                            onChange={(e) => setReturnCode(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowReturnModal(false)} className="flex-1 py-3 font-bold text-gray-500">Vazgeç</button>
                            <button onClick={handleBulkReturn} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100">İade Et</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Stock Detail Modal (KBB) */}
            {selectedStockItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] w-full max-w-3xl shadow-2xl animate-scale-up overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
                                    <Box size={28} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{selectedStockItem.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium">P/N: <span className="font-mono">{selectedStockItem.partNumber}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStockItem(null)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 rounded-full transition-all">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Kayıtlı Seri Numaraları</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {(selectedStockItem.kbbSerials || []).map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
                                            <span className="text-sm font-bold font-mono text-gray-900">{s}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingSerialIdx(idx); setEditingSerialVal(s); setShowEditSerialModal(true); }} className="p-2 text-gray-400 hover:text-blue-600"><Edit3 size={14}/></button>
                                                <button onClick={async () => {
                                                    if (await appConfirm(`${s} silinsin mi?`)) {
                                                        const updated = selectedStockItem.kbbSerials.filter((_, i) => i !== idx);
                                                        await updateInventoryItem(selectedStockItem._id || selectedStockItem.id, { kbbSerials: updated, quantity: updated.length });
                                                        setSelectedStockItem({...selectedStockItem, kbbSerials: updated, quantity: updated.length});
                                                    }
                                                }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Part Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                    <Plus size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Yeni Parça Kaydı</h3>
                                    <p className="text-sm text-gray-500 font-medium">Envantere yeni ürün ekleyin.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 rounded-full transition-all">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Parça Tanımı (Açıklama)</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium"
                                        placeholder="Örn: iPhone 13 Pro Ekran"
                                        value={newPart.name}
                                        onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Parça Kodu (P/N)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-mono font-bold"
                                            placeholder="661-XXXXX"
                                            value={newPart.partNumber}
                                            onChange={(e) => setNewPart({...newPart, partNumber: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Mağaza Ambarı</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium appearance-none"
                                            value={newPart.storeId}
                                            onChange={(e) => setNewPart({...newPart, storeId: e.target.value})}
                                        >
                                            {visibleServicePoints.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">KGB Seri Numaraları</label>
                                        <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                            {newPart.kgbSerial ? newPart.kgbSerial.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).length : 0} adet
                                        </span>
                                    </div>
                                    <textarea 
                                        rows="2"
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-mono font-bold resize-none"
                                        placeholder="Her satıra bir adet veya virgülle ayırarak girin (Örn: KGB123, KGB456)"
                                        value={newPart.kgbSerial}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const count = val.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).length;
                                            setNewPart({
                                                ...newPart,
                                                kgbSerial: val,
                                                quantity: Math.max(1, count)
                                            });
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kategori</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium appearance-none"
                                            value={newPart.category}
                                            onChange={(e) => setNewPart({...newPart, category: e.target.value})}
                                        >
                                            <option value="iPhone">iPhone</option>
                                            <option value="iPad">iPad</option>
                                            <option value="Mac">Mac</option>
                                            <option value="Watch">Watch</option>
                                            <option value="Aksesuar">Aksesuar</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kritik Seviye</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                                            value={newPart.minLevel}
                                            onChange={(e) => setNewPart({...newPart, minLevel: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={async () => {
                                    if (!newPart.name || !newPart.partNumber) {
                                        showToast('Lütfen Tanım ve Kod alanlarını doldurun', 'warning');
                                        return;
                                    }
                                    
                                    const serials = newPart.kgbSerial
                                        ? newPart.kgbSerial.split(/[\n,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
                                        : [];
                                    const qty = serials.length > 0 ? serials.length : 1;
                                    
                                    const partToSave = {
                                        ...newPart,
                                        kgbSerials: serials,
                                        quantity: qty
                                    };

                                    const success = await addInventoryItem(partToSave);
                                    if (success) {
                                        showToast('Yeni parça başarıyla eklendi', 'success');
                                        setShowAddModal(false);
                                        setNewPart({ name: '', partNumber: '', kgbSerial: '', category: 'iPhone', storeId: selectedStoreId || (currentUser?.storeId || ''), quantity: 1, minLevel: 5, warehouseType: 'KGB' });
                                    }
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} /> Kaydı Tamamla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Part Detail Modal */}
            {selectedPartDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPartDetails(null)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <Package size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedPartDetails.name}</h2>
                                    <span className="text-[11px] font-mono font-bold text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded">
                                        {selectedPartDetails.partNumber || 'Kod Yok'}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedPartDetails(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Stok Adedi</p>
                                    <p className={`text-2xl font-black ${selectedPartDetails.quantity < selectedPartDetails.minLevel ? 'text-red-500' : 'text-gray-900'}`}>
                                        {selectedPartDetails.quantity}
                                    </p>
                                    {selectedPartDetails.quantity < selectedPartDetails.minLevel && (
                                        <span className="text-[9px] font-bold text-red-500 uppercase">Kritik Seviye</span>
                                    )}
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Min. Seviye</p>
                                    <p className="text-2xl font-black text-gray-900">{selectedPartDetails.minLevel ?? '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ambar</p>
                                    <p className={`text-sm font-black mt-1 ${selectedPartDetails.warehouseType === 'KBB' ? 'text-indigo-600' : 'text-blue-600'}`}>
                                        {selectedPartDetails.warehouseType || 'KGB'}
                                    </p>
                                </div>
                            </div>

                            {/* Info Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <Tag size={16} className="text-gray-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Kategori</p>
                                        <p className="text-sm font-bold text-gray-800">{selectedPartDetails.category || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <MapPin size={16} className="text-gray-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Mağaza</p>
                                        <p className="text-sm font-bold text-gray-800">
                                            {servicePoints.find(s => String(s.id) === String(selectedPartDetails.storeId))?.name || 'Genel'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* KGB Serials */}
                            {selectedPartDetails.warehouseType !== 'KBB' && (
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Layers size={14} className="text-blue-500" />
                                        KGB Seri Numaraları
                                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {(selectedPartDetails.kgbSerials || []).length} adet
                                        </span>
                                        {isManager && (
                                            <button
                                                onClick={async () => {
                                                    const newSerial = await appPrompt('Yeni KGB Seri Numarası girin:');
                                                    if (newSerial && newSerial.trim()) {
                                                        const serial = newSerial.trim().toUpperCase();
                                                        const currentSerials = selectedPartDetails.kgbSerials || [];
                                                        if (currentSerials.includes(serial)) {
                                                            showToast('Bu seri numarası zaten ekli!', 'warning');
                                                            return;
                                                        }
                                                        const newSerials = [...currentSerials, serial];
                                                        const newQty = newSerials.length;
                                                        const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, { kgbSerials: newSerials, quantity: newQty });
                                                        if (success) {
                                                            setSelectedPartDetails(prev => ({ ...prev, kgbSerials: newSerials, quantity: newQty }));
                                                            showToast('Yeni seri numarası eklendi', 'success');
                                                        }
                                                    }
                                                }}
                                                className="ml-auto p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                title="Seri Numarası Ekle"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </p>

                                    {selectedPartDetails.kgbSerials && selectedPartDetails.kgbSerials.length > 0 ? (
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                            {selectedPartDetails.kgbSerials.map((serial, idx) => (
                                                <div key={idx} className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2 group/serial">
                                                    <span className="text-[10px] font-bold text-blue-400 w-5 text-center">{idx + 1}</span>
                                                    <span className="font-mono text-sm font-bold text-blue-800 tracking-wider flex-1">{serial}</span>
                                                    {isManager && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/serial:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={async () => {
                                                                    const newSerial = await appPrompt('Yeni seri numarasını girin:', serial);
                                                                    if (newSerial && newSerial !== serial) {
                                                                        const newSerials = [...selectedPartDetails.kgbSerials];
                                                                        newSerials[idx] = newSerial;
                                                                        const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, { kgbSerials: newSerials });
                                                                        if (success) {
                                                                            setSelectedPartDetails(prev => ({ ...prev, kgbSerials: newSerials }));
                                                                            showToast('Seri numarası güncellendi', 'success');
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                                title="Düzenle"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (await appConfirm(`"${serial}" seri numarası silinsin mi?`)) {
                                                                        const newSerials = selectedPartDetails.kgbSerials.filter((_, i) => i !== idx);
                                                                        const newQty = Math.max(0, (selectedPartDetails.quantity || 1) - 1);
                                                                        const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, { kgbSerials: newSerials, quantity: newQty });
                                                                        if (success) {
                                                                            setSelectedPartDetails(prev => ({ ...prev, kgbSerials: newSerials, quantity: newQty }));
                                                                            showToast('Seri numarası silindi', 'success');
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Sil"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200 text-gray-400">
                                            <Layers size={18} className="opacity-40" />
                                            <p className="text-sm font-medium">Bu parçaya ait KGB seri numarası bulunmuyor.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setSelectedPartDetails(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                            >
                                Kapat
                            </button>
                            {isManager && (
                                <button
                                    onClick={async () => {
                                        if (await appConfirm(`"${selectedPartDetails.name}" silinsin mi?`)) {
                                            await removeInventoryItem(selectedPartDetails._id || selectedPartDetails.id);
                                            showToast('Parça silindi', 'success');
                                            setSelectedPartDetails(null);
                                        }
                                    }}
                                    className="px-5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Sil
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
