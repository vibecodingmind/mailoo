import React, { useState, useEffect } from 'react';
import {
  Contact as ContactIcon,
  Search,
  Plus,
  Star,
  Mail,
  Phone,
  Building,
  Edit2,
  Trash2,
  Sparkles,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { Contact } from '../../types.js';

interface ContactsViewProps {
  onComposeTo?: (contactEmail: string, contactName: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onComposeTo }) => {
  const { selectedMailbox, showToast } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterVipOnly, setFilterVipOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    phone: '',
    notes: '',
    isVip: false,
    avatarColor: '#3b82f6',
  });

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getContacts(selectedMailbox?.id);
      setContacts(res.contacts || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch contacts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [selectedMailbox?.id]);

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      company: '',
      role: '',
      phone: '',
      notes: '',
      isVip: false,
      avatarColor: '#3b82f6',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      company: contact.company || '',
      role: contact.role || '',
      phone: contact.phone || '',
      notes: contact.notes || '',
      isVip: contact.isVip || false,
      avatarColor: contact.avatarColor || '#3b82f6',
    });
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast('Name and email are required', 'error');
      return;
    }

    try {
      if (editingContact) {
        await api.updateContact(editingContact.id, formData);
        showToast('Contact updated successfully', 'success');
      } else {
        await api.createContact({ ...formData, mailboxId: selectedMailbox?.id });
        showToast('Contact created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save contact', 'error');
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (confirm(`Remove ${name} from address book?`)) {
      try {
        await api.deleteContact(id);
        showToast('Contact deleted', 'success');
        fetchContacts();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete contact', 'error');
      }
    }
  };

  const toggleVipStatus = async (contact: Contact) => {
    try {
      await api.updateContact(contact.id, { isVip: !contact.isVip });
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, isVip: !c.isVip } : c))
      );
      showToast(`${contact.name} ${!contact.isVip ? 'marked as VIP' : 'removed from VIPs'}`, 'info');
    } catch (err: any) {
      showToast('Failed to update VIP status', 'error');
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()));
    if (filterVipOnly) return matchesSearch && c.isVip;
    return matchesSearch;
  });

  return (
    <div id="contacts-view" className="flex-1 flex flex-col h-full bg-[#09090B] text-[#E4E4E7] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#27272A] bg-[#0F0F12] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white">
            <ContactIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Contacts & Address Book</h1>
            <p className="text-xs text-[#A1A1AA]">
              Manage internal collaborators, VIP clients, architectural partners, and suppliers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchContacts}
            className="p-2 rounded-md bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="px-6 py-3.5 border-b border-[#27272A] bg-[#121215] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterVipOnly(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !filterVipOnly
                ? 'bg-white text-black font-semibold'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
          >
            All Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setFilterVipOnly(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              filterVipOnly
                ? 'bg-amber-400 text-black font-semibold'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>VIP Senders ({contacts.filter((c) => c.isVip).length})</span>
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-[#E4E4E7] placeholder-[#71717A] focus:outline-none focus:border-white transition-colors"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#71717A]">
            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading address book...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#27272A] rounded-lg p-8 text-center bg-[#0F0F12]">
            <ContactIcon className="w-8 h-8 text-[#71717A] mb-3" />
            <h3 className="text-sm font-semibold text-white">No contacts found</h3>
            <p className="text-xs text-[#71717A] max-w-sm mt-1">
              Add your frequent correspondents, clients, and VIP partners for rapid autocomplete and custom alert rules.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                id={`contact-card-${contact.id}`}
                className="bg-[#121215] border border-[#27272A] hover:border-[#3F3F46] rounded-lg p-4 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs border border-white/10 shadow-sm"
                        style={{ backgroundColor: contact.avatarColor || '#3b82f6' }}
                      >
                        {contact.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-white">{contact.name}</h3>
                          {contact.isVip && (
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" title="VIP Sender" />
                          )}
                        </div>
                        {contact.role && contact.company && (
                          <p className="text-[11px] text-[#A1A1AA]">
                            {contact.role} · {contact.company}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleVipStatus(contact)}
                      title={contact.isVip ? 'Remove VIP status' : 'Mark as VIP'}
                      className={`p-1.5 rounded hover:bg-[#27272A] transition-colors ${
                        contact.isVip ? 'text-amber-400' : 'text-[#71717A] hover:text-amber-400'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${contact.isVip ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-[#A1A1AA]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#71717A]" />
                      <span className="truncate text-[#E4E4E7]">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#71717A]" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-[11px] text-[#71717A] italic mt-2 line-clamp-2 border-l-2 border-[#27272A] pl-2">
                        "{contact.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (onComposeTo) {
                        onComposeTo(contact.email, contact.name);
                      } else {
                        showToast(`Initiating compose to ${contact.email}`, 'info');
                      }
                    }}
                    className="px-3 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-white border border-[#27272A] flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 rounded hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                      title="Edit contact"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.name)}
                      className="p-1.5 rounded hover:bg-rose-500/10 text-[#71717A] hover:text-rose-400 transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121215] border border-[#27272A] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
              <h2 className="text-sm font-semibold text-white">
                {editingContact ? 'Edit Contact' : 'Create New Contact'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#71717A] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Henrik Lindqvist"
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. henrik@lindqvist-timber.se"
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Lindqvist Timber Works"
                    className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Role / Title</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Master Craftsman"
                    className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+46 8 492 1029"
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Notes / Context</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key contractor for glue-lam timber structures..."
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="contact-is-vip"
                  checked={formData.isVip}
                  onChange={(e) => setFormData({ ...formData, isVip: e.target.checked })}
                  className="rounded bg-[#18181B] border-[#27272A] text-amber-500 focus:ring-0"
                />
                <label htmlFor="contact-is-vip" className="text-xs text-[#E4E4E7] flex items-center gap-1.5 cursor-pointer">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Mark as VIP Sender (Highlights priority threads)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-[#A1A1AA] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-xs font-semibold text-black shadow-sm"
                >
                  {editingContact ? 'Save Changes' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
