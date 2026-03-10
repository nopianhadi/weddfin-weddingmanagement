/**
 * Chat Template Manager Component
 * UI untuk mengelola chat templates dengan offline support
 */

import React, { useState } from 'react';
import type { ChatTemplate, Profile } from '../types';
import { useChatTemplates } from '../hooks/useChatTemplates';
import { PlusIcon, PencilIcon, Trash2Icon } from '../constants';
import Modal from './Modal';

interface ChatTemplateManagerProps {
  userProfile: Profile;
  onClose: () => void;
  showNotification: (message: string) => void;
}

const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

export const ChatTemplateManager: React.FC<ChatTemplateManagerProps> = ({
  userProfile,
  onClose,
  showNotification,
}) => {
  const {
    templates,
    loading,
    error,
    isOnline,
    updateTemplate,
    addTemplate,
    deleteTemplate,
    resetToDefaults,
    validateTemplate,
  } = useChatTemplates(userProfile);

  const [editingTemplate, setEditingTemplate] = useState<ChatTemplate | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    template: '',
  });

  const handleEdit = (template: ChatTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      template: template.template,
    });
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setEditingTemplate(null);
    setFormData({
      title: '',
      template: '',
    });
    setIsAddingNew(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        // Update existing
        await updateTemplate(editingTemplate.id, {
          title: formData.title,
          template: formData.template,
        });
        showNotification('Template berhasil diupdate!');
      } else {
        // Add new
        await addTemplate({
          title: formData.title,
          template: formData.template,
        });
        showNotification('Template berhasil ditambahkan!');
      }

      setEditingTemplate(null);
      setIsAddingNew(false);
      setFormData({ title: '', template: '' });
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Hapus template ini?')) return;

    try {
      await deleteTemplate(templateId);
      showNotification('Template berhasil dihapus!');
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset ke template default? Semua custom template akan dihapus.')) return;

    try {
      await resetToDefaults();
      showNotification('Template berhasil direset ke default!');
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsAddingNew(false);
    setFormData({ title: '', template: '' });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Kelola Chat Templates">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-brand-text-primary">
              Chat Templates
            </h3>
            <p className="text-sm text-brand-text-secondary">
              {templates.length} template tersedia
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="btn-secondary text-sm"
              disabled={loading}
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600">
                <RefreshCwIcon className="w-4 h-4 text-white" />
              </span>
              Reset
            </button>
            <button
              onClick={handleAddNew}
              className="btn-primary text-sm"
              disabled={loading || isAddingNew}
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600">
                <PlusIcon className="w-4 h-4 text-white" />
              </span>
              Tambah
            </button>
          </div>
        </div>

        {/* Offline indicator */}
        {!isOnline && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            📡 Offline - Perubahan akan disinkronkan saat online
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-brand-text-secondary mt-2">Loading templates...</p>
          </div>
        )}

        {/* Form (Edit/Add) */}
        {(editingTemplate || isAddingNew) && (
          <div className="p-4 bg-brand-input rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-text-primary mb-1">
                Judul Template
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field"
                placeholder="e.g. Welcome Message"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-primary mb-1">
                Template Message
              </label>
              <textarea
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="input-field min-h-[120px]"
                placeholder="Gunakan {clientName}, {projectName}, dll untuk variable"
              />
              <p className="text-xs text-brand-text-secondary mt-1">
                Variable yang tersedia: {'{clientName}'}, {'{projectName}'}, {'{eventDate}'}, {'{location}'}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} className="btn-primary flex-1">
                {editingTemplate ? 'Update' : 'Tambah'}
              </button>
              <button onClick={handleCancel} className="btn-secondary flex-1">
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Template List */}
        {!loading && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 bg-brand-surface border border-brand-border rounded-lg hover:border-brand-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-brand-text-primary">
                      {template.title}
                    </h4>
                    <p className="text-sm text-brand-text-secondary mt-1 line-clamp-2">
                      {template.template}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                      title="Hapus"
                    >
                      <Trash2Icon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && templates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-brand-text-secondary">Belum ada template</p>
            <button onClick={handleAddNew} className="btn-primary mt-4">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600">
                <PlusIcon className="w-4 h-4 text-white" />
              </span>
              Tambah Template Pertama
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
