// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Package, Search, Plus, Filter, ArrowUpRight, ArrowDownRight, 
    Tag, Recycle, Box, Clock, AlertCircle, Truck, CheckCircle, 
    Trash2, Edit3, X, ChevronRight, ArrowRightLeft, ChevronDown, 
    Check, AlertTriangle, Layers, MapPin, MoreHorizontal, CreditCard, Store,
    Smartphone, Laptop, Tablet, Cpu, History, Calendar, ExternalLink, Watch
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { hasPermission, ROLES } from '../utils/permissions';
import { appConfirm, appPrompt } from '../utils/alert';
import MyPhoneIcon from './LocalIcons';

const StockManagement = () => {
    const { 
        inventory, addInventoryItem, updateInventoryItem, removeInventoryItem,
        servicePoints, visibleServicePoints, currentUser, showToast, selectedStoreId, setSelectedStoreId,
        repairs, updateRepair, returnKbbStock
    } = useAppContext();

    // Role-based access
    const isManager = (() => {
        const role = currentUser?.role?.toLowerCase();
        return role === ROLES.SUPER_ADMIN || role === ROLES.STORE_MANAGER || role === ROLES.SERVICE_SUPERVISOR || role === 'admin' || role === 'servis_sorumlusu' || role === 'servissorumlusu';
    })();

    // Unified Tab State: 'inventory' or 'kbb'
    const [activeMainTab, setActiveMainTab] = useState('inventory');
    
    // KBB Specific Tab State
    const [activeKbbTab, setActiveKbbTab] = useState('stocks'); // 'stocks', 'loaners', 'returns'
    
    const [searchTerm, setSearchTerm] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [activeCategory, setActiveCategory] = useState('all');
    const [warehouseType, setWarehouseType] = useState('KGB'); 
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPartDetails, setSelectedPartDetails] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [transferPart, setTransferPart] = useState(null);
    
    const [newPart, setNewPart] = useState({ name: '', partNumber: '', kgbSerial: '', category: 'iPhone', storeId: (selectedStoreId && selectedStoreId !== 0) ? selectedStoreId : (currentUser?.storeId || ''), quantity: 1, minLevel: 5, warehouseType: 'KGB' });

    // Detailed Part Modal editing and search states
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [serialSearchTerm, setSerialSearchTerm] = useState('');
    const [editFormFields, setEditFormFields] = useState({ name: '', partNumber: '', price: 0, location: '', category: '', minLevel: 5, storeId: 1 });
    const [modalActiveTab, setModalActiveTab] = useState('details');

    const getCategoryIcon = (category) => {
        switch (category?.toLowerCase()) {
            case 'iphone':
                return Smartphone;
            case 'ipad':
                return Tablet;
            case 'mac':
                return Laptop;
            case 'watch':
                return Watch;
            case 'aksesuar':
            case 'accessory':
                return Cpu;
            default:
                return Package;
        }
    };

    const partUsageHistory = useMemo(() => {
        if (!selectedPartDetails) return [];
        const pNumber = selectedPartDetails.partNumber?.toLowerCase() || '';
        const pName = selectedPartDetails.name?.toLowerCase() || '';
        if (!pNumber && !pName) return [];

        return repairs.filter(repair => 
            (repair.parts || []).some(p => 
                (p.partNumber && p.partNumber.toLowerCase() === pNumber) || 
                (p.name && p.name.toLowerCase() === pName)
            )
        ).map(repair => {
            const matchingPart = (repair.parts || []).find(p => 
                (p.partNumber && p.partNumber.toLowerCase() === pNumber) || 
                (p.name && p.name.toLowerCase() === pName)
            );
            return {
                repairId: repair.id,
                date: repair.date,
                customer: repair.customer,
                device: repair.device,
                status: repair.status,
                price: matchingPart?.price || selectedPartDetails.price
            };
        });
    }, [selectedPartDetails, repairs]);

    const handleQtyAdjust = async (amount) => {
        if (!selectedPartDetails) return;
        const newQty = Math.max(0, (selectedPartDetails.quantity || 0) + amount);
        const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, { quantity: newQty });
        if (success) {
            setSelectedPartDetails(prev => ({ ...prev, quantity: newQty }));
            showToast('Stok adedi güncellendi', 'success');
        }
    };

    const handleSaveDetails = async () => {
        if (!selectedPartDetails) return;
        if (!editFormFields.name || !editFormFields.partNumber) {
            showToast('Lütfen Parça Tanımı ve Kod alanlarını doldurun', 'warning');
            return;
        }
        const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, {
            name: editFormFields.name,
            partNumber: editFormFields.partNumber,
            price: Number(editFormFields.price),
            location: editFormFields.location,
            category: editFormFields.category,
            minLevel: Number(editFormFields.minLevel),
            storeId: Number(editFormFields.storeId)
        });
        if (success) {
            setSelectedPartDetails(prev => ({
                ...prev,
                ...editFormFields,
                price: Number(editFormFields.price),
                minLevel: Number(editFormFields.minLevel),
                storeId: Number(editFormFields.storeId)
            }));
            setIsEditingDetails(false);
            showToast('Parça detayları güncellendi', 'success');
        }
    };

    // KBB Specific State
    const [selectedItems, setSelectedItems] = useState([]);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnCode, setReturnCode] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [editingSerialIdx, setEditingSerialIdx] = useState(-1);
    // eslint-disable-next-line no-unused-vars
    const [editingSerialVal, setEditingSerialVal] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [showEditSerialModal, setShowEditSerialModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [currentSerial, setCurrentSerial] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [serialList, setSerialList] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    // eslint-disable-next-line no-unused-vars
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

    // eslint-disable-next-line no-unused-vars
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

        // İade edilen parçaları ilgili mağazanın KBB ambarından düş
        const kbbToDeduct = itemsToReturn.map(item => ({
            storeId: item.storeId,
            partNumber: item.partNumber,
            name: item.name || item.description,
            kbbSerial: item.kbbSerial
        }));
        await returnKbbStock(kbbToDeduct, returnCode);

        showToast(`${itemsToReturn.length} parça iade edildi ve KBB ambarından düşüldü.`, 'success');
        setShowReturnModal(false);
        setReturnCode('');
        setSelectedItems([]);
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-24 animate-fade-in font-sans">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-4 px-1">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Envanter Yönetimi</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">{activeMainTab === 'inventory' ? `${warehouseType} Ambarı` : 'Apple İade / KBB'}</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Stok Yönetimi</h1>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/50">
                        <button
                            onClick={() => { setActiveMainTab('inventory'); setSearchTerm(''); }}
                            className={`px-6 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center gap-2 ${activeMainTab === 'inventory' ? 'bg-white text-[#0071e3] shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
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
                                <Filter size={14} className="text-gray-400 group-hover:text-[#0071e3] transition-colors" />
                                <span className="text-[13px] font-medium text-[#1d1d1f]">
                                    {selectedStoreId === 0 ? 'Tüm Mağazalar' : (servicePoints.find(s => String(s.id) === String(selectedStoreId))?.name || 'Mağaza')}
                                </span>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showStoreDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowStoreDropdown(false)}></div>
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                                        {hasPermission(currentUser, 'view_all_stores') && !['technician', 'reception', 'teknisyen', 'storemanager', 'servis_sorumlusu', 'servissorumlusu'].includes(currentUser?.role?.toLowerCase()) && (
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
                    {/* General Stock View — Warehouse Toolbar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/50">
                            <button
                                onClick={() => setWarehouseType('KGB')}
                                className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center gap-2 ${warehouseType === 'KGB' ? 'bg-white text-[#0071e3] shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Box size={15} /> KGB · Yeni Parça
                            </button>
                            <button
                                onClick={() => setWarehouseType('KBB')}
                                className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center gap-2 ${warehouseType === 'KBB' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Recycle size={15} /> KBB · İade / İkinci El
                            </button>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Envanterde ara..."
                                    className="w-full bg-[#f5f5f7] border-transparent rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="bg-[#0071e3] hover:bg-[#0077ed] text-white h-10 px-6 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#0071e3]/20 flex-shrink-0 active:scale-95"
                            >
                                <Plus size={18} /> Parça Ekle
                            </button>
                        </div>
                    </div>



                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Toplam Parça', value: totalItems, subtitle: 'Envanterdeki parçalar', icon: Package, color: 'text-[#0071e3]' },
                            { label: 'Kritik Stok', value: lowStockItems, subtitle: 'Tedarik gerekenler', icon: AlertTriangle, color: lowStockItems > 0 ? 'text-[#e30000]' : 'text-gray-400' },
                            { label: 'Envanter Değeri', value: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalValue), subtitle: 'Genel tutar', icon: Tag, color: 'text-[#8e24aa]' }
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div className={`p-3 rounded-xl bg-gray-50 ${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-xl font-bold text-[#1d1d1f]">{stat.value}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{stat.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Inventory Table */}
                    <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm max-h-[550px] overflow-y-auto custom-scrollbar relative">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-gray-200">
                                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-4 bg-[#f5f5f7] border-b border-gray-200">Parça Bilgisi</th>
                                    <th className="px-6 py-4 bg-[#f5f5f7] border-b border-gray-200">P/N Kodu</th>
                                    {selectedStoreId === 0 && <th className="px-6 py-4 bg-[#f5f5f7] border-b border-gray-200">Şube</th>}
                                    <th className="px-6 py-4 bg-[#f5f5f7] border-b border-gray-200 text-center">Stok Adedi</th>
                                    <th className="px-6 py-4 bg-[#f5f5f7] border-b border-gray-200 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredParts.map((item) => (
                                    <tr 
                                        key={item._id || item.id} 
                                        onClick={() => {
                                            setSelectedPartDetails(item);
                                            setModalActiveTab('details');
                                            setIsEditingDetails(false);
                                            setSerialSearchTerm('');
                                            setEditFormFields({
                                                name: item.name || '',
                                                partNumber: item.partNumber || '',
                                                price: item.price || 0,
                                                location: item.location || '',
                                                category: item.category || '',
                                                minLevel: item.minLevel ?? 5,
                                                storeId: item.storeId ?? 1
                                            });
                                        }}
                                        className="hover:bg-gray-50/80 active:scale-[0.995] transition-all duration-200 group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 text-[#0071e3] rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 group-hover:scale-105 transition-all">
                                                    {(() => {
                                                        const IconComponent = getCategoryIcon(item.category);
                                                        return <IconComponent size={18} />;
                                                    })()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-[#1d1d1f] leading-none group-hover:text-[#0071e3] transition-colors">
                                                            {item.name}
                                                        </p>
                                                        {item.quantity === 0 ? (
                                                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-650 border border-red-200/50 shadow-sm shadow-red-50/50">STOKTA YOK</span>
                                                        ) : item.quantity < item.minLevel ? (
                                                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-650 border border-amber-200/50 shadow-sm shadow-amber-50/50 animate-pulse">KRİTİK</span>
                                                        ) : (
                                                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-650 border border-emerald-200/50 shadow-sm shadow-emerald-50/50">STOKTA</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-gray-400 font-bold tracking-tight">
                                                        <span className="text-gray-500 font-semibold">{item.category}</span>
                                                        {item.location && (
                                                            <>
                                                                <span className="text-gray-300 font-normal">•</span>
                                                                <span className="flex items-center gap-1"><MapPin size={10} className="text-gray-400" /> {item.location}</span>
                                                            </>
                                                        )}
                                                        {item.price > 0 && (
                                                            <>
                                                                <span className="text-gray-300 font-normal">•</span>
                                                                <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(item.price)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[12px] font-mono font-black text-gray-600 bg-gray-150/70 border border-gray-200/50 px-2.5 py-1 rounded-lg uppercase shadow-sm">{item.partNumber || '-'}</span>
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
                                                <span className={`text-[15px] font-black w-12 text-center ${item.quantity < item.minLevel ? 'text-red-500 font-extrabold scale-110 duration-200' : 'text-gray-900'}`}>{item.quantity}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <div className="p-2 text-gray-400 group-hover:text-[#0071e3] group-hover:translate-x-1 transition-all duration-200">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredParts.length === 0 && (
                            <div className="py-20 text-center">
                                <Package className="mx-auto text-gray-200 mb-4" size={48} />
                                <h3 className="text-lg font-bold text-[#1d1d1f]">Parça Bulunamadı</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Bu {warehouseType} ambarında {selectedStoreId === 0 ? '' : 'bu mağazaya ait '}kayıtlı parça yok.
                                </p>
                            </div>
                        )}
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
                        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm max-h-[550px] overflow-y-auto custom-scrollbar relative">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                                    <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <th className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                            <input type="checkbox" onChange={handleSelectAll} checked={selectedItems.length === filteredKbbItems.length && filteredKbbItems.length > 0} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                                        </th>
                                        <th className="px-6 py-4 bg-gray-50 border-b border-gray-200">Geri Gönderilecek Parça</th>
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
                        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm max-h-[550px] overflow-y-auto custom-scrollbar relative">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                                    <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <th className="px-6 py-4 bg-gray-50 border-b border-gray-200">Parça Bilgisi</th>
                                        <th className="px-6 py-4 bg-gray-50 border-b border-gray-200">P/N Kodu</th>
                                        <th className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-center">Stok Adedi</th>
                                        <th className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {inventory.filter(i => i.warehouseType === 'KBB' || (i.category === 'parts' && (selectedStoreId === 0 || String(i.storeId) === String(selectedStoreId)))).map(item => (
                                        <tr 
                                            key={item.id} 
                                            className="hover:bg-indigo-50/20 active:scale-[0.995] transition-all duration-200 group cursor-pointer" 
                                            onClick={() => {
                                                setSelectedPartDetails(item);
                                                setModalActiveTab('details');
                                                setIsEditingDetails(false);
                                                setSerialSearchTerm('');
                                                setEditFormFields({
                                                    name: item.name || '',
                                                    partNumber: item.partNumber || '',
                                                    price: item.price || 0,
                                                    location: item.location || '',
                                                    category: item.category || '',
                                                    minLevel: item.minLevel ?? 5,
                                                    storeId: item.storeId ?? 1
                                                });
                                            }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50/60 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-indigo-100 group-hover:scale-105 transition-all">
                                                        {(() => {
                                                            const IconComponent = getCategoryIcon(item.category);
                                                            return <IconComponent size={18} />;
                                                        })()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-950 leading-none group-hover:text-indigo-600 transition-colors">{item.name}</p>
                                                        <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-gray-400 font-bold tracking-tight">
                                                            <span className="text-indigo-700 font-extrabold text-[9px] bg-indigo-50 border border-indigo-200/50 shadow-sm shadow-indigo-50/50 px-2 py-0.5 rounded-full uppercase">KBB DEPOSU</span>
                                                            {item.location && (
                                                                <>
                                                                    <span className="text-gray-300 font-normal">•</span>
                                                                    <span className="flex items-center gap-1"><MapPin size={10} className="text-gray-400" /> {item.location}</span>
                                                                </>
                                                            )}
                                                            {item.price > 0 && (
                                                                <>
                                                                    <span className="text-gray-300 font-normal">•</span>
                                                                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(item.price)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[12px] font-mono font-black text-gray-650 bg-gray-150/70 border border-gray-200/50 px-2.5 py-1 rounded-lg uppercase shadow-sm">{item.partNumber || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[14px] font-black text-gray-800 bg-indigo-50/30 px-3 py-1.5 rounded-lg border border-indigo-150/20">{item.quantity} Adet</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="p-2 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200 inline-block">
                                                    <ChevronRight size={18} />
                                                </div>
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

            {/* Selected Stock Detail Modal (KBB) removed and unified */}
            {/* Add Part Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#0071e3] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                                    <Plus size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Yeni Parça Kaydı</h3>
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
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none font-medium"
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
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none font-mono font-bold"
                                            placeholder="661-XXXXX"
                                            value={newPart.partNumber}
                                            onChange={(e) => setNewPart({...newPart, partNumber: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Mağaza Ambarı</label>
                                        <select
                                            className={`w-full p-4 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium appearance-none ${!newPart.storeId ? 'border-red-300 text-red-500' : 'border-gray-200'}`}
                                            value={newPart.storeId}
                                            onChange={(e) => setNewPart({...newPart, storeId: e.target.value})}
                                        >
                                            <option value="">Mağaza Seçiniz...</option>
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
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none font-mono font-bold resize-none"
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
                                    if (!newPart.storeId || Number(newPart.storeId) === 0) {
                                        showToast('Lütfen parçanın ekleneceği mağaza ambarını seçin', 'warning');
                                        return;
                                    }

                                    const serials = newPart.kgbSerial
                                        ? newPart.kgbSerial.split(/[\n,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
                                        : [];
                                    const qty = serials.length > 0 ? serials.length : 1;

                                    const partToSave = {
                                        ...newPart,
                                        storeId: Number(newPart.storeId),
                                        kgbSerials: serials,
                                        quantity: qty
                                    };
                                    const success = await addInventoryItem(partToSave);
                                    if (success) {
                                        showToast('Yeni parça başarıyla eklendi', 'success');
                                        setShowAddModal(false);
                                        setNewPart({ name: '', partNumber: '', kgbSerial: '', category: 'iPhone', storeId: (selectedStoreId && selectedStoreId !== 0) ? selectedStoreId : (currentUser?.storeId || ''), quantity: 1, minLevel: 5, warehouseType: 'KGB' });
                                    }
                                }}
                                className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#0071e3]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
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
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-4 animate-fade-in">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                    {(() => {
                                        const IconComponent = getCategoryIcon(selectedPartDetails.category);
                                        return <IconComponent size={22} />;
                                    })()}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900 truncate" title={selectedPartDetails.name}>{selectedPartDetails.name}</h2>
                                    <span className="text-[11px] font-mono font-bold text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded">
                                        {selectedPartDetails.partNumber || 'KOD YOK'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isManager && !isEditingDetails && (
                                    <button
                                        onClick={() => setIsEditingDetails(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <Edit3 size={14} /> Düzenle
                                    </button>
                                )}
                                <button onClick={() => setSelectedPartDetails(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Body - Two Column Grid */}
                        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                            {/* Left Column: Info Card or Edit Form / Usage History */}
                            <div className="space-y-5 flex flex-col h-full min-h-0">
                                {isEditingDetails ? (
                                    /* Edit Form */
                                    <div className="space-y-4 animate-fade-in">
                                        <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest pl-1">Parça Detaylarını Düzenle</h3>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Parça Tanımı</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold"
                                                value={editFormFields.name}
                                                onChange={e => setEditFormFields({ ...editFormFields, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">P/N Kodu</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-mono font-bold"
                                                    value={editFormFields.partNumber}
                                                    onChange={e => setEditFormFields({ ...editFormFields, partNumber: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Fiyat (₺)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold"
                                                    value={editFormFields.price}
                                                    onChange={e => setEditFormFields({ ...editFormFields, price: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Kategori</label>
                                                <select 
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
                                                    value={editFormFields.category}
                                                    onChange={e => setEditFormFields({ ...editFormFields, category: e.target.value })}
                                                >
                                                    <option value="iPhone">iPhone</option>
                                                    <option value="iPad">iPad</option>
                                                    <option value="Mac">Mac</option>
                                                    <option value="Watch">Watch</option>
                                                    <option value="Aksesuar">Aksesuar</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Raf Konumu</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold"
                                                    value={editFormFields.location}
                                                    placeholder="Örn: Raf A-3"
                                                    onChange={e => setEditFormFields({ ...editFormFields, location: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Kritik Limit</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold"
                                                    value={editFormFields.minLevel}
                                                    onChange={e => setEditFormFields({ ...editFormFields, minLevel: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Mağaza Ambarı</label>
                                                <select 
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
                                                    value={editFormFields.storeId}
                                                    onChange={e => setEditFormFields({ ...editFormFields, storeId: Number(e.target.value) })}
                                                >
                                                    {visibleServicePoints.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button 
                                                onClick={handleSaveDetails}
                                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 flex items-center justify-center gap-1.5"
                                            >
                                                <Check size={14} /> Kaydet
                                            </button>
                                            <button 
                                                onClick={() => setIsEditingDetails(false)}
                                                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-250 text-gray-600 rounded-xl font-bold text-xs transition-colors"
                                            >
                                                Vazgeç
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Tabbed view: details or history */
                                    <div className="space-y-5 flex flex-col h-full min-h-0 animate-fade-in">
                                        {/* Premium Custom Tabs */}
                                        <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50 backdrop-blur-md shrink-0">
                                            <button
                                                onClick={() => setModalActiveTab('details')}
                                                className={`flex-1 py-2 rounded-lg text-[12px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${modalActiveTab === 'details' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                <Package size={14} /> Detaylar & Stok
                                            </button>
                                            <button
                                                onClick={() => setModalActiveTab('history')}
                                                className={`flex-1 py-2 rounded-lg text-[12px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${modalActiveTab === 'history' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                <History size={14} /> Kullanım Geçmişi ({partUsageHistory.length})
                                            </button>
                                        </div>

                                        {modalActiveTab === 'details' ? (
                                            /* Details tab */
                                            <div className="space-y-5 animate-fade-in">
                                                {/* Status Banner */}
                                                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                                                    selectedPartDetails.quantity === 0
                                                        ? 'bg-red-50 border-red-200 text-red-800'
                                                        : selectedPartDetails.quantity < selectedPartDetails.minLevel
                                                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                                                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                }`}>
                                                    <div className="shrink-0">
                                                        {selectedPartDetails.quantity === 0 ? (
                                                            <AlertTriangle size={20} className="text-red-500 animate-bounce" />
                                                        ) : selectedPartDetails.quantity < selectedPartDetails.minLevel ? (
                                                            <AlertTriangle size={20} className="text-amber-500 animate-pulse" />
                                                        ) : (
                                                            <CheckCircle size={20} className="text-emerald-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-extrabold uppercase tracking-wide">
                                                            {selectedPartDetails.quantity === 0
                                                                ? 'Stokta Yok'
                                                                : selectedPartDetails.quantity < selectedPartDetails.minLevel
                                                                ? 'Kritik Stok Seviyesi'
                                                                : 'Stok Durumu Yeterli'}
                                                        </p>
                                                        <p className="text-[11px] opacity-85 font-medium mt-0.5">
                                                            {selectedPartDetails.quantity === 0
                                                                ? 'Bu parça şu anda stokta kalmamıştır. Tedarik talep edilmesi önerilir.'
                                                                : selectedPartDetails.quantity < selectedPartDetails.minLevel
                                                                ? `Stok kritik limit olan ${selectedPartDetails.minLevel} adedin altındadır.`
                                                                : 'Stok adedi kritik limitin üzerindedir, işlem yapmaya uygundur.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Details Grid Cards */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                                                            <Tag size={14} className="text-blue-500/70" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Kategori</span>
                                                        </div>
                                                        <p className="text-sm font-extrabold text-gray-800">{selectedPartDetails.category || '-'}</p>
                                                    </div>
                                                    
                                                    <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                                                            <MapPin size={14} className="text-blue-500/70" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Raf Konumu</span>
                                                        </div>
                                                        <p className="text-sm font-extrabold text-gray-800">{selectedPartDetails.location || 'Belirtilmemiş'}</p>
                                                    </div>

                                                    <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                                                            <CreditCard size={14} className="text-blue-500/70" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Parça Fiyatı</span>
                                                        </div>
                                                        <p className="text-sm font-extrabold text-gray-850">
                                                            {selectedPartDetails.price > 0 
                                                                ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedPartDetails.price)
                                                                : 'Fiyat Belirtilmemiş'}
                                                        </p>
                                                    </div>

                                                    <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                                                            <Store size={14} className="text-blue-500/70" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Bulunduğu Depo</span>
                                                        </div>
                                                        <p className="text-sm font-extrabold text-gray-850 truncate" title={servicePoints.find(s => String(s.id) === String(selectedPartDetails.storeId))?.name || 'Genel'}>
                                                            {servicePoints.find(s => String(s.id) === String(selectedPartDetails.storeId))?.name || 'Genel'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Stock Level & Stepper */}
                                                <div className="p-4 bg-gray-50/80 border border-gray-200/50 rounded-xl space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Güncel Envanter Seviyesi</p>
                                                            <p className="text-xs text-gray-400 font-bold mt-0.5">Kritik Stok Limiti: {selectedPartDetails.minLevel ?? 5}</p>
                                                        </div>
                                                        <span className={`text-2xl font-black ${selectedPartDetails.quantity < selectedPartDetails.minLevel ? 'text-red-500 scale-105' : 'text-gray-900'} transition-all`}>
                                                            {selectedPartDetails.quantity} Adet
                                                        </span>
                                                    </div>

                                                    <div className="h-px bg-gray-200" />

                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-[11px] text-gray-400 font-bold leading-tight">
                                                            {((selectedPartDetails.kgbSerials && selectedPartDetails.kgbSerials.length > 0) || (selectedPartDetails.kbbSerials && selectedPartDetails.kbbSerials.length > 0))
                                                                ? '⚠️ Seri numaralı parçalarda adet, seri listesinden yönetilir.' 
                                                                : 'Adedi hızlıca artırın/azaltın:'}
                                                        </span>
                                                        {!((selectedPartDetails.kgbSerials && selectedPartDetails.kgbSerials.length > 0) || (selectedPartDetails.kbbSerials && selectedPartDetails.kbbSerials.length > 0)) && (
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <button 
                                                                    onClick={() => handleQtyAdjust(-1)}
                                                                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-150 hover:text-red-500 active:scale-90 shadow-sm transition-all flex items-center justify-center font-black text-lg"
                                                                    title="Stok Azalt"
                                                                >
                                                                    -
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleQtyAdjust(1)}
                                                                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-150 hover:text-green-500 active:scale-90 shadow-sm transition-all flex items-center justify-center font-black text-lg"
                                                                    title="Stok Artır"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Usage History Tab */
                                            <div className="space-y-4 flex-1 flex flex-col min-h-0 animate-fade-in">
                                                <div>
                                                    <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest pl-1">Servis Kullanım Kayıtları</h4>
                                                    <p className="text-[11px] text-gray-400 mt-0.5 pl-1">Bu parça kodunun kullanıldığı tüm aktif servis kayıtları.</p>
                                                </div>
                                                
                                                {partUsageHistory.length > 0 ? (
                                                    <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-2.5 custom-scrollbar">
                                                        {partUsageHistory.map((rep, idx) => (
                                                            <div key={idx} className="bg-gray-50 border border-gray-150 rounded-xl p-3.5 hover:bg-blue-50/15 hover:border-blue-150 transition-all duration-200 flex flex-col gap-2 relative group/item">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[11px] font-black text-blue-600 bg-blue-50/70 border border-blue-150/45 px-2 py-0.5 rounded-lg uppercase tracking-wider shadow-sm">
                                                                        #{rep.repairId}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                                                        <Calendar size={11} className="text-gray-400" /> {rep.date?.split(' ')[0]}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="flex justify-between items-start mt-0.5">
                                                                    <div>
                                                                        <h5 className="text-xs font-bold text-gray-900">{rep.customer}</h5>
                                                                        <p className="text-[11px] text-gray-500 font-bold mt-0.5">{rep.device}</p>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1.5">
                                                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                                                            rep.status === 'Tamamlandı'
                                                                                ? 'bg-emerald-50 text-emerald-655 border-emerald-200/50'
                                                                                : rep.status === 'İptal' || rep.status === 'İade'
                                                                                ? 'bg-rose-50 text-rose-655 border-rose-200/50'
                                                                                : 'bg-amber-50 text-amber-655 border-amber-200/50'
                                                                        }`}>
                                                                            {rep.status}
                                                                        </span>
                                                                        {rep.price > 0 && (
                                                                            <span className="text-[10px] font-black text-gray-400">
                                                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(rep.price)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 border border-dashed border-gray-250 rounded-2xl text-gray-400 text-center">
                                                        <History size={28} className="opacity-30 mb-2" />
                                                        <p className="text-xs font-extrabold">Bu parçaya ait kullanım geçmişi bulunamadı.</p>
                                                        <p className="text-[10px] text-gray-400 mt-1 max-w-[240px]">Bu parça numarası henüz herhangi bir servis kaydında kullanılmamıştır.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Serials management */}
                            <div className="border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 flex flex-col space-y-4 animate-fade-in">
                                {(() => {
                                    const isKbb = selectedPartDetails.warehouseType === 'KBB';
                                    const serialsField = isKbb ? 'kbbSerials' : 'kgbSerials';
                                    const currentSerials = selectedPartDetails[serialsField] || [];
                                    
                                    return (
                                        <>
                                            <div>
                                                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                                    <Layers size={14} className="text-blue-500" />
                                                    {isKbb ? 'KBB Seri Numaraları' : 'KGB Seri Numaraları'}
                                                    <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                        {currentSerials.length} adet
                                                    </span>
                                                </h3>
                                                <p className="text-[11px] text-gray-400 font-medium">Bu ürüne ait tekil seri numaraları listesidir.</p>
                                            </div>

                                            {/* Inline Add Serial Form */}
                                            {isManager && (
                                                <form 
                                                    onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        const form = e.target;
                                                        const input = form.elements.serialInput;
                                                        const val = input.value.trim().toUpperCase();
                                                        if (!val) return;
                                                        
                                                        if (currentSerials.includes(val)) {
                                                            showToast('Bu seri numarası zaten ekli!', 'warning');
                                                            return;
                                                        }
                                                        const newSerials = [...currentSerials, val];
                                                        const newQty = newSerials.length;
                                                        const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, { [serialsField]: newSerials, quantity: newQty });
                                                        if (success) {
                                                            setSelectedPartDetails(prev => ({ ...prev, [serialsField]: newSerials, quantity: newQty }));
                                                            showToast('Seri numarası eklendi', 'success');
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="flex gap-2"
                                                >
                                                    <input 
                                                        name="serialInput"
                                                        type="text" 
                                                        placeholder="Yeni Seri No Ekle..."
                                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:bg-white focus:border-blue-500 outline-none transition-all uppercase"
                                                    />
                                                    <button 
                                                        type="submit"
                                                        className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1 shrink-0"
                                                    >
                                                        <Plus size={14} /> Ekle
                                                    </button>
                                                </form>
                                            )}

                                            {/* Serials search */}
                                            {currentSerials.length > 5 && (
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Seri numaralarında ara..."
                                                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
                                                        value={serialSearchTerm}
                                                        onChange={e => setSerialSearchTerm(e.target.value)}
                                                    />
                                                    {serialSearchTerm && (
                                                        <button onClick={() => setSerialSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Serials List */}
                                            {currentSerials.length > 0 ? (
                                                <div className="flex-1 overflow-y-auto max-h-56 pr-1 space-y-1.5 custom-scrollbar">
                                                    {currentSerials
                                                        .filter(s => s.toLowerCase().includes(serialSearchTerm.toLowerCase()))
                                                        .map((serial, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 bg-blue-50/30 hover:bg-blue-50/65 border border-blue-150/50 rounded-xl px-3 py-2 group/serial transition-all duration-200">
                                                                <span className="text-[10px] font-bold text-blue-400 w-5 text-center">{idx + 1}</span>
                                                                <span className="font-mono text-[12px] font-extrabold text-blue-950 tracking-wider flex-1">{serial}</span>
                                                                {isManager && (
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover/serial:opacity-100 transition-opacity duration-200">
                                                                        <button
                                                                            onClick={async () => {
                                                                                const newSerial = await appPrompt('Yeni seri numarasını girin:', serial);
                                                                                if (newSerial && newSerial !== serial) {
                                                                                    const newSerials = [...currentSerials];
                                                                                    newSerials[idx] = newSerial.trim().toUpperCase();
                                                                                    const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, { [serialsField]: newSerials });
                                                                                    if (success) {
                                                                                        setSelectedPartDetails(prev => ({ ...prev, [serialsField]: newSerials }));
                                                                                        showToast('Seri numarası güncellendi', 'success');
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="p-1 text-blue-450 hover:text-blue-655 hover:bg-blue-100 rounded transition-colors"
                                                                            title="Düzenle"
                                                                        >
                                                                            <Edit3 size={11} />
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (await appConfirm(`"${serial}" seri numarası silinsin mi?`)) {
                                                                                    const newSerials = currentSerials.filter((_, i) => i !== idx);
                                                                                    const newQty = Math.max(0, (selectedPartDetails.quantity || 1) - 1);
                                                                                    const success = await updateInventoryItem(selectedPartDetails._id || selectedPartDetails.id, { [serialsField]: newSerials, quantity: newQty });
                                                                                    if (success) {
                                                                                        setSelectedPartDetails(prev => ({ ...prev, [serialsField]: newSerials, quantity: newQty }));
                                                                                        showToast('Seri numarası silindi', 'success');
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="p-1 text-red-400 hover:text-red-655 hover:bg-red-50 rounded transition-colors"
                                                                            title="Sil"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-center">
                                                    <Layers size={24} className="opacity-30 mb-2" />
                                                    <p className="text-xs font-semibold">Bu parçaya ait kayıtlı seri numarası bulunmuyor.</p>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between gap-3">
                            {isManager && (
                                <button
                                    onClick={async () => {
                                        if (await appConfirm(`"${selectedPartDetails.name}" silinsin mi?`)) {
                                            await removeInventoryItem(selectedPartDetails._id || selectedPartDetails.id);
                                            showToast('Parça silindi', 'success');
                                            setSelectedPartDetails(null);
                                        }
                                    }}
                                    className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-xs transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 size={14} /> Ürünü Tamamen Sil
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedPartDetails(null)}
                                className="px-6 py-2.5 rounded-xl bg-white border border-gray-250 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors shadow-sm ml-auto"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
