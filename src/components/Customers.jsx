import React, { useState, useEffect } from 'react';
import { User, Plus, Search, Filter, Mail, MapPin, MoreHorizontal, Edit, Calendar, DollarSign, Tag, Clock, ChevronRight, MessageCircle, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import MyPhoneIcon from './LocalIcons';
import Collapse from './ui/Collapse';
// eslint-disable-next-line no-unused-vars
import { appConfirm, appAlert } from '../utils/alert';

const Customers = ({ setActiveTab, setServiceInitialData }) => {
    const { customers, addCustomer, updateCustomer, repairs, sendWhatsApp, removeCustomer, currentUser } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null); // For detail view

    // --- Customer Form ---
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', type: 'Bireysel', address: '', notes: ''
    });

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ name: '', phone: '', email: '', type: 'Bireysel', address: '', notes: '' });
        setShowModal(true);
    };

    const openEditModal = (customer) => {
        setIsEditing(true);
        setFormData(customer);
        setShowModal(true);
    };

    const handleSaveCustomer = async (e) => {
        e.preventDefault();
        if (isEditing) {
            await updateCustomer(formData._id || formData.id, formData);
            if (selectedCustomer?.id === formData.id) {
                setSelectedCustomer(prev => ({ ...prev, ...formData }));
            }
        } else {
            await addCustomer(formData);
        }
        setShowModal(false);
    };

    const handleNewRepair = () => {
        if (!selectedCustomer) return;
        setServiceInitialData({
            customerName: selectedCustomer.name,
            customerPhone: selectedCustomer.phone,
            customerEmail: selectedCustomer.email,
            customerAddress: selectedCustomer.address,
            customerTC: selectedCustomer.id // Using ID as Account ID/TC
        });
        setActiveTab('service');
    };

    const toggleTag = (tag) => {
        if (!selectedCustomer) return;
        const currentTags = selectedCustomer.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];

        updateCustomer(selectedCustomer.id, { tags: newTags });
        setSelectedCustomer(prev => ({ ...prev, tags: newTags }));
    };

    const confirmAndDeleteCustomer = async (customer) => {
        if (!customer) return;
        
        const confirmed = await appConfirm(
            `<div class="text-red-600 font-bold mb-2">DİKKAT: MÜŞTERİ SİLİNİYOR</div>
            <span><b>${customer.name}</b> isimli müşteri veritabanından kalıcı olarak silinecektir. Onaylıyor musunuz?</span>`
        );

        if (confirmed) {
            const success = await removeCustomer(customer._id || customer.id);
            if (success !== false) {
                if (selectedCustomer?.id === customer.id || selectedCustomer?._id === customer._id) {
                    setSelectedCustomer(null);
                }
            }
        }
    };

    // Filter Logic
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // eslint-disable-next-line no-unused-vars
    const [groupBy, setGroupBy] = useState('letter'); // 'letter' | 'type'
    const [collapsedGroups, setCollapsedGroups] = useState([]);

    // Sort and Group
    const groupedCustomers = filteredCustomers.sort((a, b) => a.name.localeCompare(b.name, 'tr')).reduce((acc, customer) => {
        let key = '';
        if (groupBy === 'letter') {
            key = customer.name.charAt(0).toUpperCase();
        } else {
            key = customer.type || 'Bireysel';
        }
        if (!acc[key]) acc[key] = [];
        acc[key].push(customer);
        return acc;
    }, {});

    const sortedGroups = Object.keys(groupedCustomers).sort((a, b) => a.localeCompare(b, 'tr'));

    // Default collapse all groups on first load
    useEffect(() => {
        setCollapsedGroups(sortedGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupBy]);

    const toggleGroup = (key) => {
        setCollapsedGroups(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    // Get History for Selected Customer
    const customerHistory = selectedCustomer
        ? repairs.filter(r => r.customer?.toLowerCase() === selectedCustomer.name.toLowerCase() || r.customerPhone === selectedCustomer.phone)
        : [];

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header - Ana Sayfa Stili */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-md text-blue-600 border border-blue-100 shadow-sm">
                        <User size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Müşteri Rehberi</h2>
                        <p className="text-gray-500 mt-1 font-medium">Müşteri portföyünüzü ve servis geçmişlerini yönetin.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Müşteri Ara..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={openAddModal}
                        className="h-10 px-4 bg-gray-900 text-white rounded-md text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-all flex items-center gap-2 shadow-md active:scale-95"
                    >
                        <Plus size={16} /> YENİ MÜŞTERİ
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sol Liste (Gridified Collapsible List) */}
                <div className={`${selectedCustomer ? 'hidden lg:block lg:col-span-4' : 'col-span-12'} space-y-6 h-screen overflow-y-auto pr-4 custom-scrollbar sticky top-28 pb-40 px-2`}>
                    {sortedGroups.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                            <User size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Kayıtlı müşteri bulunamadı.</p>
                        </div>
                    ) : (
                        sortedGroups.map(groupKey => {
                            const isCollapsed = collapsedGroups.includes(groupKey);
                            return (
                                <div key={groupKey} className={`group/section rounded-lg border transition-all duration-300 ${isCollapsed ? 'bg-gray-50/50 border-gray-200 shadow-sm' : 'bg-transparent border-transparent'}`}>
                                    <div 
                                        onClick={() => toggleGroup(groupKey)}
                                        className="flex justify-between items-center h-14 px-5 cursor-pointer hover:bg-gray-100/50 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-md bg-gray-900 text-white flex items-center justify-center font-semibold text-[11px] shadow-sm group-hover/section:scale-110 transition-transform">
                                                {groupKey}
                                            </div>
                                            <span className="text-[11px] font-semibold text-xs uppercase tracking-wide text-gray-400">{groupKey === 'letter' ? 'Harf Grubu' : groupBy === 'letter' ? 'Grup' : groupKey}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-semibold text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                                {groupedCustomers[groupKey].length} KİŞİ
                                            </span>
                                            <div className={`p-1.5 rounded-lg bg-white border border-gray-100 text-gray-400 transition-all duration-300 ${isCollapsed ? '' : 'rotate-180 bg-gray-900 text-white border-gray-900 shadow-md'}`}>
                                                <ChevronRight size={12} className="rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Collapse open={!isCollapsed}>
                                        {() => (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 p-2.5">
                                            {groupedCustomers[groupKey].map(customer => (
                                                <button
                                                    key={customer.id}
                                                    onClick={() => setSelectedCustomer(customer)}
                                                    className={`aspect-square p-2 rounded-[22px] border-2 transition-all flex flex-col items-center justify-center text-center relative group/card ${selectedCustomer?.id === customer.id
                                                        ? 'bg-gray-900 border-gray-900 text-white shadow-sm scale-[1.05] z-10'
                                                        : 'bg-white border-white/60 hover:bg-white hover:border-gray-900 hover:shadow-sm'
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-md flex items-center justify-center font-semibold text-sm mb-1 shadow-inner transition-transform group-hover/card:scale-110 ${selectedCustomer?.id === customer.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-900'
                                                        }`}>
                                                        {customer.name.substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <p className={`text-[9px] font-semibold leading-[1.1] uppercase line-clamp-2 px-0.5 tracking-tight ${selectedCustomer?.id === customer.id ? 'text-white' : 'text-gray-900'}`}>
                                                        {customer.name}
                                                    </p>
                                                    {customer.tags?.includes('VIP') && (
                                                        <div className="absolute -top-0.5 -right-0.5 bg-yellow-400 p-1 rounded-lg shadow-md border-2 border-white">
                                                            <Tag size={8} className="text-yellow-900 fill-current" />
                                                        </div>
                                                    )}

                                                    {/* Quick Delete for Superadmin */}
                                                    {currentUser?.role?.toLowerCase() === 'superadmin' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                confirmAndDeleteCustomer(customer);
                                                            }}
                                                            className="absolute -top-2 -left-2 bg-red-500 text-white p-1.5 rounded-lg shadow-lg opacity-0 group-hover/card:opacity-100 transition-all hover:scale-110 active:scale-95 z-20"
                                                            title="Müşteriyi Sil"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        )}
                                    </Collapse>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sağ Detay Paneli (Premium Redesign) */}
                {selectedCustomer && (
                    <div className="lg:col-span-8 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-white/80 backdrop-blur-2xl rounded-lg shadow-sm border border-white overflow-hidden sticky top-28 h-fit max-h-[calc(100vh-140px)] flex flex-col">
                            
                            {/* Profile Header Block */}
                            <div className="relative shrink-0 p-10 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 border-b border-gray-100">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.03] select-none pointer-events-none">
                                    <User size={240} strokeWidth={1} />
                                </div>

                                {/* Top Actions */}
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="lg:hidden text-gray-500 bg-white shadow-sm border border-gray-100 p-3 rounded-md hover:bg-gray-50 transition-all"
                                    >
                                        <ChevronRight className="rotate-180" size={20} />
                                    </button>
                                    
                                    <div className="flex gap-3 ml-auto">
                                        {currentUser?.role?.toLowerCase() === 'superadmin' && (
                                            <button
                                                onClick={() => confirmAndDeleteCustomer(selectedCustomer)}
                                                className="border border-red-200 px-4 py-2 hover:bg-red-50 bg-white rounded-md text-sm font-semibold flex items-center gap-2 text-red-600 transition-colors"
                                                title="Müşteriyi Sil"
                                            >
                                                <Trash2 size={16} /> Sil
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEditModal(selectedCustomer)}
                                            className="border border-[#d2d2d7] px-4 py-2 hover:bg-[#f5f5f7] bg-white rounded-md text-sm font-semibold flex items-center gap-2 text-gray-700"
                                        >
                                            <Edit size={16} /> Düzenle
                                        </button>
                                        <button
                                            onClick={handleNewRepair}
                                            className="gsx-button-primary px-4 py-2 text-sm"
                                        >
                                            <Plus size={16} strokeWidth={3} /> Yeni Servis
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-end gap-8 relative z-10">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-lg bg-white p-1 shadow-sm ring-4 ring-gray-50/50">
                                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-[36px] flex items-center justify-center text-4xl font-semibold text-white shadow-inner">
                                                {selectedCustomer.name.substring(0, 1).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-white rounded-md flex items-center justify-center shadow-sm">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        </div>
                                    </div>

                                    <div className="flex-1 mb-2">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h1 className="text-4xl font-semibold text-gray-900 tracking-tight uppercase">{selectedCustomer.name}</h1>
                                            <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-100 text-xs uppercase tracking-wide">{selectedCustomer.type}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm font-bold">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-100 shadow-sm text-gray-600">
                                                    <MyPhoneIcon size={14} className="text-blue-500" /> {selectedCustomer.phone}
                                                </span>
                                                <button 
                                                    onClick={() => sendWhatsApp(selectedCustomer.phone, `Merhaba %s, Troy Teknik Servis'ten Arıyoruz...`)}
                                                    className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-100 active:scale-90"
                                                    title="WhatsApp'tan Yaz"
                                                >
                                                    <MessageCircle size={16} fill="currentColor" />
                                                </button>
                                            </div>
                                            {selectedCustomer.email && (
                                                <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-100 shadow-sm text-gray-600"><Mail size={14} className="text-purple-500" /> {selectedCustomer.email}</span>
                                            )}
                                            <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-100 shadow-sm text-gray-600"><Tag size={14} className="text-orange-500" /> {selectedCustomer.id}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 pt-8 space-y-10">
                                
                                {/* Quick Stats Section */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                            <Clock size={20} />
                                        </div>
                                        <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Toplam Geçmiş</p>
                                        <p className="text-3xl font-semibold text-gray-900 leading-none">{customerHistory.length} <span className="text-xs text-gray-300 font-bold">Adet</span></p>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                                            <DollarSign size={20} />
                                        </div>
                                        <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Hesap Hareketleri</p>
                                        <p className="text-3xl font-semibold text-gray-900 leading-none">₺{customerHistory.length * 1250} <span className="text-xs text-gray-300 font-bold">NET</span></p>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow group text-right">
                                        <div className="w-10 h-10 rounded-md bg-purple-50 flex items-center justify-center text-purple-600 mb-4 ml-auto group-hover:scale-110 transition-transform">
                                            <Calendar size={20} />
                                        </div>
                                        <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Son Etkileşim</p>
                                        <p className="text-xl font-semibold text-gray-900 leading-none truncate">{customerHistory.length > 0 ? customerHistory[0].date : 'YOK'}</p>
                                    </div>
                                </div>

                                {/* Information & Notes */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Address & Identity */}
                                    <div className="space-y-6">
                                        <div className="bg-gray-50/50 p-8 rounded-lg border border-gray-100 relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <MapPin size={14} className="text-blue-500" /> Adres ve Lokasyon
                                            </h4>
                                            <p className="text-gray-700 font-bold leading-relaxed">
                                                {selectedCustomer.address || 'Henüz bir adres bilgisi tanımlanmamış. Düzenle butonu ile adres ekleyebilirsiniz.'}
                                            </p>
                                        </div>

                                        <div className="bg-gray-50/50 p-8 rounded-lg border border-gray-100 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <Edit size={14} className="text-orange-500" /> Müşteri Özel Notları
                                            </h4>
                                            <p className="text-gray-600 font-medium italic text-sm leading-relaxed">
                                                {selectedCustomer.notes || 'Herhangi bir özel not bulunmuyor.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tags & Categories */}
                                    <div className="bg-gray-50 p-8 rounded-lg border border-gray-100 flex flex-col">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <Tag size={16} /> Aktif Segmentasyon
                                        </h4>
                                        <div className="flex flex-wrap gap-2 mb-auto">
                                            {['VIP', 'Sorunlu', 'Kurumsal', 'Sadık Müşteri'].map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleTag(tag)}
                                                    className={`px-4 py-2 rounded-md text-[10px] font-semibold border transition-all ${selectedCustomer.tags?.includes(tag)
                                                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm shadow-gray-300'
                                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
                                                        }`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="mt-8 p-5 bg-white rounded-lg border border-gray-200/60 shadow-inner">
                                            <p className="text-[10px] font-semibold text-gray-300 uppercase mb-3">Sistem Kimliği</p>
                                            <code className="text-[11px] font-mono text-blue-600 break-all bg-blue-50 px-2 py-1 rounded-lg">#CUST-{selectedCustomer.id}</code>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Timeline Section */}
                                <div className="pt-2">
                                    <h4 className="text-xl font-semibold text-gray-900 mb-8 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-md bg-gray-900 text-white flex items-center justify-center shadow-sm">
                                            <Clock size={20} />
                                        </div>
                                        Cihaz ve Servis Zaman Çizelgesi
                                    </h4>
                                    
                                    <div className="relative pl-8 space-y-6 before:absolute before:left-[23px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-100">
                                        // eslint-disable-next-line no-unused-vars
                                        {customerHistory.map((history, /* idx */) => (
                                            <div key={history.id} className="relative group/item flex items-center gap-6 p-4 bg-white rounded-[28px] border border-gray-100 hover:border-blue-200 hover:translate-x-2 transition-all">
                                                <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-gray-50 bg-white group-hover/item:bg-blue-500 transition-colors"></div>
                                                
                                                <div className="w-16 h-16 rounded-md bg-gray-50 flex flex-col items-center justify-center text-center p-2 group-hover/item:bg-blue-50 transition-colors">
                                                    <span className="text-[10px] font-semibold text-gray-400 leading-none mb-1">MODEL</span>
                                                    <span className="text-[11px] font-semibold text-gray-900 leading-tight truncate w-full">{history.device.split(' ')[0]}</span>
                                                </div>
                                                
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h5 className="font-semibold text-gray-900 text-lg">{history.device}</h5>
                                                        <span className="text-[10px] font-mono font-bold text-gray-300">#{history.id}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-[9px] font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wide ${
                                                            history.status === 'Tamamlandı' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        }`}>
                                                            {history.status}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5"><Calendar size={12} /> {history.date}</span>
                                                    </div>
                                                </div>
                                                
                                                <button className="w-10 h-10 rounded-md bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all mr-2">
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {customerHistory.length === 0 && (
                                            <div className="py-20 text-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-100">
                                                <div className="w-20 h-20 bg-white rounded-lg mx-auto flex items-center justify-center text-gray-200 mb-6 shadow-sm">
                                                    <Clock size={40} strokeWidth={1} />
                                                </div>
                                                <p className="text-gray-400 font-bold text-xs uppercase tracking-wide text-xs">Bu müşteri için henüz <br/> bir servis kaydı oluşturulmamış.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content w-full max-w-lg p-6">
                        <h3 className="text-2xl font-semibold text-gray-900 mb-6">{isEditing ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</h3>
                        <form onSubmit={handleSaveCustomer} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ad Soyad</label>
                                <input required type="text" className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 outline-none focus:border-blue-500 font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefon</label>
                                    <input required type="tel" className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 outline-none focus:border-blue-500 font-medium font-mono" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-Posta</label>
                                    <input type="email" className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 outline-none focus:border-blue-500 font-medium" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Müşteri Tipi</label>
                                <select className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 outline-none focus:border-blue-500 font-medium transition-all" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="Bireysel">Bireysel Müşteri</option>
                                    <option value="Kurumsal">Kurumsal Müşteri</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adres Bilgisi</label>
                                <textarea rows="2" className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 outline-none focus:border-blue-500 font-medium" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Açık adres giriniz..."/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Özel Notlar</label>
                                <textarea rows="2" className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 outline-none focus:border-blue-500 font-medium italic" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Müşteri hakkında özel notlar..."/>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-gray-500 font-semibold hover:bg-gray-50 border border-[#d2d2d7] rounded-md transition-all">İptal</button>
                                <button type="submit" className="gsx-button-primary flex-1 py-2 font-semibold text-sm">{isEditing ? 'Bilgileri Güncelle' : 'Müşteriyi Kaydet'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
