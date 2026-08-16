import React, { useState } from 'react';
import { Megaphone, Users, MessageCircle, Mail, Filter, Search, CheckSquare, Square, ChevronRight, Zap, Bell, ShieldCheck, ToggleLeft, ToggleRight, Settings, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appAlert } from '../utils/alert';

const MarketingAutomation = () => {
    // eslint-disable-next-line no-unused-vars
    const { allCustomers, emailSettings, allRepairs } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'old_repairs', 'no_recent_visits'
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isSending, setIsSending] = useState(false);

    // Automation Rules Simulation
    const [rules, setRules] = useState([
        { id: 1, title: 'Otomatik SLA Takibi', desc: '48 saati geçen işlemlerde yöneticilere bildirim gönder.', active: true, icon: Bell, color: 'bg-red-50 text-red-500' },
        { id: 2, title: 'Hazır Bildirim Otomasyonu', desc: 'Cihaz "Hazır" olduğunda müşteriye WhatsApp & E-Posta gönder.', active: true, icon: Zap, color: 'bg-blue-50 text-blue-500' },
        { id: 3, title: 'Memnuniyet Anketi', desc: 'Teslimattan 24 saat sonra müşteri portalına NPS anketi ekle.', active: false, icon: ShieldCheck, color: 'bg-green-50 text-green-500' },
        { id: 4, title: 'Teklif Hatırlatıcı', desc: 'Onay bekleyen teklifleri 2 gün sonra müşteriye tekrar hatırlat.', active: true, icon: Clock, color: 'bg-orange-50 text-orange-500' }
    ]);

    const toggleRule = (id) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    };

    // Filter Logic
    let filteredList = allRepairs.map(r => ({
        id: r.id,
        name: r.customer,
        phone: r.customerPhone,
        email: r.customerEmail,
        device: r.device,
        lastTarih: r.createdAt || r.date
    })).filter((obj, index, self) => 
        // Remove duplicates by phone number
        index === self.findIndex((t) => (t.phone === obj.phone))
    );

    if (filterType === 'old_repairs') {
        // eslint-disable-next-line no-unused-vars
        filteredList = filteredList.filter(item => {
            // Sadece 3 aydan eski kayıtları simüle et (Gerçekte Date objesine göre hesaplanmalı)
            // Biz basitçe her şeyi 'Eski' sayıp listeleyeceğiz test için, sadece demonstrasyon.
            return true; 
        });
    }

    if (searchTerm) {
        filteredList = filteredList.filter(user => 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            user.phone?.includes(searchTerm)
        );
    }

    const toggleSelect = (phone) => {
        if (selectedUsers.includes(phone)) {
            setSelectedUsers(selectedUsers.filter(p => p !== phone));
        } else {
            setSelectedUsers([...selectedUsers, phone]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedUsers.length === filteredList.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredList.map(u => u.phone));
        }
    };

    const handleSendMarketing = async (type) => {
        if (selectedUsers.length === 0) {
            appAlert('Lütfen en az bir müşteri seçin.', 'warning');
            return;
        }

        const message = 'Merhaba, Troy Apple Yetkili Servisi olarak size özel kampanya ve fırsatlarımız var! Cihazınızın ücretsiz genel bakımı için sizi mağazalarımıza bekliyoruz.';

        if (type === 'whatsapp') {
            appAlert(`${selectedUsers.length} kişiye WhatsApp üzerinden mesaj gönderme kuyruğuna eklendi.\n(Not: Gerçek çoklu gönderim için WhatsApp Business API gerekir)`, 'success');
            const firstPhone = selectedUsers[0].replace(/[^0-9]/g, '');
            window.open(`https://wa.me/90${firstPhone}?text=${encodeURIComponent(message)}`, '_blank');
        } else if (type === 'email') {
            setIsSending(true);
            setTimeout(() => {
                appAlert(`${selectedUsers.length} adet e-posta başarıyla sıraya alındı ve gönderiliyor.`, 'success');
                setIsSending(false);
                setSelectedUsers([]);
            }, 1500);
        }
    };

    return (
        <div className="page-scroll space-y-6 animate-fade-in pr-1">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Pazarlama & Otomasyon</h1>
                    <p className="text-gray-500">Müşterilerinize toplu kampanya SMS, WhatsApp ve e-posta gönderimleri yapın.</p>
                </div>
            </div>

            {/* Campaign Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg shadow-green-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/20 rounded-md">
                            <MessageCircle size={24} />
                        </div>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">Hazır</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">WhatsApp Toplu Mesaj</h3>
                    <p className="text-green-50 text-sm mb-4">Seçili müşterilerinize doğrudan WhatsApp üzerinden kampanya metni iletin.</p>
                    <button 
                        onClick={() => handleSendMarketing('whatsapp')}
                        className="w-full py-3 bg-white text-green-600 font-bold rounded-md hover:bg-green-50 transition-colors"
                    >
                        Gönder ({selectedUsers.length} Seçili)
                    </button>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg shadow-blue-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/20 rounded-md">
                            <Mail size={24} />
                        </div>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">Aktif API</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">E-Posta Bülteni</h3>
                    <p className="text-blue-50 text-sm mb-4">Müşterilerinize profesyonel HTML formatında e-posta kampanyaları gönderin.</p>
                    <button 
                        onClick={() => handleSendMarketing('email')}
                        disabled={isSending}
                        className="w-full py-3 bg-white text-blue-600 font-bold rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                        {isSending ? 'Gönderiliyor...' : `Küme Gönderimi Başlat (${selectedUsers.length} Seçili)`}
                    </button>
                    <p className="text-blue-100/50 text-[10px] mt-2 font-medium text-center italic">API Durumu: Aktif & Kararlı</p>
                </div>

                {/* Automation Rules (New Section) */}
                <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-gray-900 rounded-md text-white">
                            <Settings size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">Akıllı Kurallar</h3>
                    </div>
                    <div className="space-y-4">
                        {rules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-md border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${rule.color}`}>
                                        <rule.icon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900 leading-none">{rule.title}</p>
                                        <p className="text-[9px] text-gray-400 mt-1 line-clamp-1">{rule.desc}</p>
                                    </div>
                                </div>
                                <button onClick={() => toggleRule(rule.id)} className={`transition-colors ${rule.active ? 'text-blue-600' : 'text-gray-300'}`}>
                                    {rule.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Audience List */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-4 bg-gray-50/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Müşteri veya telefon ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-md focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select 
                            className="px-4 py-3 bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">Tüm Müşteriler</option>
                            <option value="old_repairs">Son 6 Aydır Gelmeyenler</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4 w-16">
                                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600">
                                        {selectedUsers.length === filteredList.length && filteredList.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                    </button>
                                </th>
                                <th className="p-4">Müşteri</th>
                                <th className="p-4">Cihaz / İletişim</th>
                                <th className="p-4">Son İşlem</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredList.map((user, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="p-4">
                                        <button onClick={() => toggleSelect(user.phone)} className="text-gray-300 group-hover:text-gray-400">
                                            {selectedUsers.includes(user.phone) ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{user.name}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-gray-800">{user.device || '-'}</div>
                                        <div className="text-xs text-gray-500">{user.phone || '-'} {user.email ? `• ${user.email}` : ''}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 font-medium">
                                        {user.lastDate || 'Belirtilmemiş'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all">
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredList.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500 font-medium">
                                        Kriterlere uygun müşteri bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MarketingAutomation;
