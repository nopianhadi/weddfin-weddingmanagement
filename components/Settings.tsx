import React, { useEffect, useState } from 'react';
import { Profile, Transaction, Project, User, ViewType, ProjectStatusConfig, SubStatusConfig, Package } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PencilIcon, PlusIcon, Trash2Icon, KeyIcon, UsersIcon, ListIcon, FolderKanbanIcon, FileTextIcon, SettingsIcon, NAV_ITEMS, DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PROJECT_TYPES, DEFAULT_EVENT_TYPES, DEFAULT_PACKAGE_CATEGORIES, DEFAULT_PROJECT_STATUS_SUGGESTIONS, DEFAULT_BRIEFING_TEMPLATE, DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PACKAGE_SHARE_TEMPLATE, DEFAULT_BOOKING_FORM_TEMPLATE } from '../constants';
import { upsertProfile } from '../services/profile';
import { createUser, updateUser, deleteUser } from '../services/users';

// Helper Component for Toggle Switches
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; id?: string }> = ({ enabled, onChange, id }) => (
    <button
        type="button"
        id={id}
        className={`${enabled ? 'bg-brand-accent' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-surface`}
        onClick={onChange}
    >
        <span
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

// Reusable UI component for managing a list of categories
const CategoryManager: React.FC<{
    title: string;
    categories: string[];
    inputValue: string;
    onInputChange: (value: string) => void;
    onAddOrUpdate: () => void;
    onEdit: (value: string) => void;
    onDelete: (value: string) => void;
    editingValue: string | null;
    onCancelEdit: () => void;
    placeholder: string;
    /** Opsi saran default untuk mempermudah input; jika ada, tombol "Tambah dari saran" ditampilkan */
    suggestedDefaults?: string[];
    onAddSuggested?: () => void;
}> = ({ title, categories, inputValue, onInputChange, onAddOrUpdate, onEdit, onDelete, editingValue, onCancelEdit, placeholder, suggestedDefaults, onAddSuggested }) => {

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onAddOrUpdate();
        }
    };

    const renderCategoryItem = (category: string) => (
        <div key={category} className="flex items-center justify-between p-2 md:p-2.5 bg-brand-bg rounded-md">
            <span className="text-xs md:text-sm text-brand-text-primary truncate flex-1 mr-2">{category}</span>
            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                <button type="button" onClick={() => onEdit(category)} className="p-1 text-brand-text-secondary hover:text-brand-accent" title="Edit"><PencilIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button type="button" onClick={() => onDelete(category)} className="p-1 text-brand-text-secondary hover:text-brand-danger" title="Hapus"><Trash2Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
            </div>
        </div>
    );

    return (
        <div>
            <h3 className="text-sm md:text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-2 md:pb-3 mb-3 md:mb-4">{title}</h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-3 md:mb-4">
                <div className="input-group flex-grow !mt-0">
                    <input
                        type="text"
                        id={`input-${title.replace(/\s/g, '')}`}
                        value={inputValue}
                        onChange={e => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder=" "
                        className="input-field"
                    />
                    <label htmlFor={`input-${title.replace(/\s/g, '')}`} className="input-label">{placeholder}</label>
                </div>
                <div className="flex gap-2">
                    <button onClick={onAddOrUpdate} className="button-primary h-fit mt-2 flex-1 sm:flex-none">{editingValue ? 'Update' : 'Tambah'}</button>
                    {editingValue && <button onClick={onCancelEdit} className="button-secondary h-fit mt-2 flex-1 sm:flex-none">Batal</button>}
                </div>
            </div>
            {suggestedDefaults?.length && onAddSuggested && (
                <div className="mb-3 md:mb-4">
                    <button type="button" onClick={onAddSuggested} className="text-xs md:text-sm text-brand-accent hover:underline">
                        + Tambah dari saran default
                    </button>
                </div>
            )}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories && categories.length > 0 ? categories.map(cat => renderCategoryItem(cat)) : (
                    <div className="text-center text-brand-text-secondary text-sm py-4">
                        Belum ada {title.toLowerCase()}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-component for Project Status Management ---
const ProjectStatusManager: React.FC<{
    config: ProjectStatusConfig[];
    onConfigChange: (newConfig: ProjectStatusConfig[]) => void;
    projects: Project[];
    profile: Profile;
    onAddDefaultStatuses?: () => void;
}> = ({ config, onConfigChange, projects, profile, onAddDefaultStatuses }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedStatus, setSelectedStatus] = useState<ProjectStatusConfig | null>(null);

    const initialFormState = {
        name: '',
        color: '#64748b',
        note: '',
        defaultProgress: undefined as number | undefined,
        subStatuses: [] as SubStatusConfig[],
    };
    const [form, setForm] = useState(initialFormState);

    const handleOpenModal = (mode: 'add' | 'edit', status?: ProjectStatusConfig) => {
        setModalMode(mode);
        if (mode === 'edit' && status) {
            setSelectedStatus(status);
            setForm({
                name: status.name,
                color: status.color,
                note: status.note,
                defaultProgress: (status as any).defaultProgress,
                subStatuses: [...status.subStatuses],
            });
        } else {
            setSelectedStatus(null);
            setForm(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'defaultProgress') {
            const num = value === '' ? undefined : Math.max(0, Math.min(100, Math.round(Number(value))));
            setForm(prev => ({ ...prev, [name]: num }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubStatusChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newSubStatuses = [...form.subStatuses];
        newSubStatuses[index] = { ...newSubStatuses[index], [name]: value };
        setForm(prev => ({ ...prev, subStatuses: newSubStatuses }));
    };

    const addSubStatus = () => {
        setForm(prev => ({ ...prev, subStatuses: [...prev.subStatuses, { name: '', note: '' }] }));
    };

    const removeSubStatus = (index: number) => {
        const newSubStatuses = [...form.subStatuses];
        newSubStatuses.splice(index, 1);
        setForm(prev => ({ ...prev, subStatuses: newSubStatuses }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            const newStatus: ProjectStatusConfig = {
                id: crypto.randomUUID(),
                ...form,
                subStatuses: form.subStatuses.filter(s => s.name.trim() !== '')
            };
            const newConfig = [...config, newStatus];
            onConfigChange(newConfig);
            // Save to Supabase
            try {
                await upsertProfile({ id: profile.id, projectStatusConfig: newConfig } as any);
            } catch (err: any) {
                console.error('[Settings] Save project status config failed:', err);
                alert('Gagal menyimpan status acara: ' + (err?.message || 'Coba lagi.'));
            }
        } else if (selectedStatus) {
            const updatedConfig = config.map(s =>
                s.id === selectedStatus.id ? { ...s, ...form, subStatuses: form.subStatuses.filter(sub => sub.name.trim() !== '') } : s
            );
            onConfigChange(updatedConfig);
            // Save to Supabase
            try {
                await upsertProfile({ id: profile.id, projectStatusConfig: updatedConfig } as any);
            } catch (err: any) {
                console.error('[Settings] Update project status config failed:', err);
                alert('Gagal mengupdate status acara: ' + (err?.message || 'Coba lagi.'));
            }
        }
        handleCloseModal();
    };

    const handleDelete = async (statusId: string) => {
        const status = config.find(s => s.id === statusId);
        if (!status) return;

        const isUsed = projects.some(p => p.status === status.name);
        if (isUsed) {
            alert(`Status "${status.name}" tidak dapat dihapus karena sedang digunakan oleh acara.`);
            return;
        }

        if (window.confirm(`Yakin ingin menghapus status "${status.name}"?`)) {
            const newConfig = config.filter(s => s.id !== statusId);
            onConfigChange(newConfig);
            // Save to Supabase
            try {
                await upsertProfile({ id: profile.id, projectStatusConfig: newConfig } as any);
            } catch (err: any) {
                console.error('[Settings] Delete project status config failed:', err);
                alert('Gagal menghapus status acara: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
                <h3 className="text-sm md:text-lg font-semibold text-brand-text-light">Manajemen Status Acara</h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {onAddDefaultStatuses && (
                        <button onClick={onAddDefaultStatuses} className="button-secondary inline-flex items-center gap-2 text-sm md:text-base">
                            + Tambah dari saran default
                        </button>
                    )}
                    <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2 w-full sm:w-auto text-sm md:text-base">
                        <PlusIcon className="w-4 h-4 md:w-5 md:h-5" /> Tambah Status
                    </button>
                </div>
            </div>
            <div className="space-y-3 md:space-y-4">
                {config.map(status => (
                    <div key={status.id} className="p-3 md:p-4 bg-brand-bg rounded-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }}></span>
                                <span className="font-semibold text-sm md:text-base text-brand-text-light">{status.name}</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                                <button onClick={() => handleOpenModal('edit', status)} className="p-1.5 md:p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><PencilIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                                <button onClick={() => handleDelete(status.id)} className="p-1.5 md:p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><Trash2Icon className="w-4 h-4 md:w-5 md:h-5" /></button>
                            </div>
                        </div>
                        {status.subStatuses.length > 0 && (
                            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-brand-border/50 pl-5 md:pl-7 space-y-1.5 md:space-y-2">
                                {status.subStatuses.map((sub, index) => (
                                    <div key={index}><p className="text-xs md:text-sm font-medium text-brand-text-primary">{sub.name}</p><p className="text-[10px] md:text-xs text-brand-text-secondary">{sub.note}</p></div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah Status Baru' : `Edit Status: ${selectedStatus?.name}`}>
                <form onSubmit={handleSubmit} className="space-y-4 form-compact form-compact--ios-scale">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="input-group md:col-span-2"><input type="text" id="name" name="name" value={form.name} onChange={handleFormChange} className="input-field" required placeholder=" " /><label htmlFor="name" className="input-label">Nama Status</label></div>
                        <div className="input-group"><input type="color" id="color" name="color" value={form.color} onChange={handleFormChange} className="input-field !p-1 h-12" /><label htmlFor="color" className="input-label">Warna</label></div>
                        <div className="input-group"><input type="number" min={0} max={100} id="defaultProgress" name="defaultProgress" value={form.defaultProgress ?? ''} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="defaultProgress" className="input-label">Default Progress (%)</label></div>
                    </div>
                    <div className="input-group"><textarea id="note" name="note" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} className="input-field" rows={2} placeholder=" " /><label htmlFor="note" className="input-label">Catatan/Deskripsi Status</label></div>

                    <div>
                        <h4 className="text-base font-semibold text-brand-text-light mb-2">Sub-Status</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {form.subStatuses.map((sub, index) => (
                                <div key={index} className="p-3 bg-brand-bg rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                    <div className="input-group !mt-0"><input type="text" name="name" value={sub.name} onChange={e => handleSubStatusChange(index, e)} placeholder="Nama Sub-Status" className="input-field !p-2 !text-sm" /></div>
                                    <div className="flex items-center gap-2">
                                        <div className="input-group flex-grow !mt-0"><input type="text" name="note" value={sub.note} onChange={e => handleSubStatusChange(index, e)} placeholder="Catatan" className="input-field !p-2 !text-sm" /></div>
                                        <button type="button" onClick={() => removeSubStatus(index)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full"><Trash2Icon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addSubStatus} className="text-sm font-semibold text-brand-accent hover:underline mt-2">+ Tambah Sub-Status</button>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Status' : 'Update Status'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

interface SettingsProps {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    transactions: Transaction[];
    projects: Project[];
    packages: Package[];
    users: User[]; // This will now be pre-filtered by App.tsx
    setUsers: React.Dispatch<React.SetStateAction<User[]>>; // This updates the global user list
    currentUser: User | null;
}

const emptyUserForm = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Member' as User['role'],
    permissions: [] as ViewType[],
};

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const Settings: React.FC<SettingsProps> = ({ profile, setProfile, transactions, projects, packages, users, setUsers, currentUser }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [didInitProjectStatuses, setDidInitProjectStatuses] = useState(false);

    useEffect(() => {
        try {
            const tab = window.localStorage.getItem('vena-settings-tab');
            if (tab) {
                setActiveTab(tab);
                window.localStorage.removeItem('vena-settings-tab');
            }
        } catch (e) {
        }
    }, []);

    // State for category management
    const [incomeCategoryInput, setIncomeCategoryInput] = useState('');
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<string | null>(null);
    const [expenseCategoryInput, setExpenseCategoryInput] = useState('');
    const [editingExpenseCategory, setEditingExpenseCategory] = useState<string | null>(null);
    const [projectTypeInput, setProjectTypeInput] = useState('');
    const [editingProjectType, setEditingProjectType] = useState<string | null>(null);
    const [eventTypeInput, setEventTypeInput] = useState('');
    const [editingEventType, setEditingEventType] = useState<string | null>(null);
    const [packageCategoryInput, setPackageCategoryInput] = useState('');
    const [editingPackageCategory, setEditingPackageCategory] = useState<string | null>(null);

    // State for user management
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userModalMode, setUserModalMode] = useState<'add' | 'edit'>('add');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [userFormError, setUserFormError] = useState('');


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };



    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert("Ukuran file logo tidak boleh melebihi 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, logoBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert("Ukuran file TTD tidak boleh melebihi 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, signatureBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNotificationChange = (key: keyof Profile['notificationSettings']) => {
        setProfile(p => {
            const base = p.notificationSettings ?? { newProject: false, paymentConfirmation: false, deadlineReminder: false };
            return {
                ...p,
                notificationSettings: {
                    ...base,
                    [key]: !(p.notificationSettings?.[key] ?? false),
                },
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) {
            setSaveError('Profil belum selesai dimuat. Silakan tunggu sebentar lalu coba lagi.');
            return;
        }
        setIsSaving(true);
        setSaveError('');
        try {
            const updated = await upsertProfile(profile);
            setProfile(updated);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            console.error('[Settings] Save profile failed:', err);
            setSaveError(err?.message || 'Gagal menyimpan profil.');
        } finally {
            setIsSaving(false);
        }
    }

    // --- User Management Handlers ---
    const handleOpenUserModal = (mode: 'add' | 'edit', user: User | null = null) => {
        setUserModalMode(mode);
        setSelectedUser(user);
        if (mode === 'edit' && user) {
            setUserForm({
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                password: '',
                confirmPassword: '',
                permissions: user.permissions || [],
            });
        } else {
            setUserForm(emptyUserForm);
        }
        setUserFormError('');
        setIsUserModalOpen(true);
    };

    const handleCloseUserModal = () => {
        setIsUserModalOpen(false);
        setSelectedUser(null);
        setUserForm(emptyUserForm);
        setUserFormError('');
    };

    const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };

    const handlePermissionsChange = (view: ViewType, checked: boolean) => {
        setUserForm(prev => {
            const currentPermissions = new Set(prev.permissions);
            if (checked) {
                currentPermissions.add(view);
            } else {
                currentPermissions.delete(view);
            }
            return { ...prev, permissions: Array.from(currentPermissions) };
        });
    };

    const handleUserFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserFormError('');

        if (userForm.password && userForm.password !== userForm.confirmPassword) {
            setUserFormError('Konfirmasi kata sandi tidak cocok.');
            return;
        }

        try {
            if (userModalMode === 'add') {
                if (!userForm.email || !userForm.password || !userForm.fullName) {
                    setUserFormError('Nama, email, dan kata sandi wajib diisi.');
                    return;
                }
                if (users.some(u => u.email === userForm.email)) {
                    setUserFormError('Email sudah digunakan di dalam vendor ini.');
                    return;
                }
                if (!currentUser) {
                    setUserFormError('Tidak dapat membuat pengguna: sesi tidak valid.');
                    return;
                }

                const newUserData = {
                    fullName: userForm.fullName,
                    email: userForm.email,
                    password: userForm.password,
                    role: userForm.role,
                    permissions: userForm.role === 'Member' ? userForm.permissions : undefined,
                };
                const created = await createUser(newUserData);
                setUsers(prev => [...prev, created]);
            } else if (userModalMode === 'edit' && selectedUser) {
                if (users.some(u => u.email === userForm.email && u.id !== selectedUser.id)) {
                    setUserFormError('Email sudah digunakan oleh pengguna lain.');
                    return;
                }

                const updateData: any = {
                    fullName: userForm.fullName,
                    email: userForm.email,
                    role: userForm.role,
                    permissions: userForm.role === 'Member' ? userForm.permissions : undefined,
                };
                if (userForm.password) {
                    updateData.password = userForm.password;
                }

                const updated = await updateUser(selectedUser.id, updateData);
                setUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u));
            }
            handleCloseUserModal();
        } catch (err: any) {
            console.error('[Settings] User operation failed:', err);
            setUserFormError(err?.message || 'Gagal menyimpan pengguna.');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (userId === currentUser?.id) {
            alert("Anda tidak dapat menghapus akun Anda sendiri.");
            return;
        }
        if (window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
            try {
                await deleteUser(userId);
                setUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err: any) {
                console.error('[Settings] Delete user failed:', err);
                alert('Gagal menghapus pengguna: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    // --- Category Management Handlers ---
    const handleAddOrUpdateIncomeCategory = async () => {
        if (!incomeCategoryInput.trim()) return;
        const newCategory = incomeCategoryInput.trim();
        const categories = profile.incomeCategories || [];

        let newCategories: string[];
        if (editingIncomeCategory) { // Update
            if (newCategory !== editingIncomeCategory && categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = categories.map(c => c === editingIncomeCategory ? newCategory : c).sort();
            setEditingIncomeCategory(null);
        } else { // Add
            if (categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = [...categories, newCategory].sort();
        }

        try {
            const updated = await upsertProfile({ id: profile.id, incomeCategories: newCategories });
            setProfile(updated);
            setIncomeCategoryInput('');
        } catch (err: any) {
            console.error('[Settings] Save income category failed:', err);
            alert('Gagal menyimpan kategori: ' + (err?.message || 'Coba lagi.'));
        }
    };

    const handleEditIncomeCategory = (category: string) => { setEditingIncomeCategory(category); setIncomeCategoryInput(category); };
    const handleDeleteIncomeCategory = async (category: string) => {
        const isCategoryInUse = transactions.some(t => t.category === category && t.type === 'Pemasukan');
        if (isCategoryInUse) {
            alert(`Kategori "${category}" tidak dapat dihapus karena sedang digunakan dalam transaksi.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus kategori "${category}"?`)) {
            const newCategories = (profile.incomeCategories || []).filter(c => c !== category);
            try {
                const updated = await upsertProfile({ id: profile.id, incomeCategories: newCategories });
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete income category failed:', err);
                alert('Gagal menghapus kategori: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    const handleAddOrUpdateExpenseCategory = async () => {
        if (!expenseCategoryInput.trim()) return;
        const newCategory = expenseCategoryInput.trim();
        const categories = profile.expenseCategories || [];

        let newCategories: string[];
        if (editingExpenseCategory) {
            if (newCategory !== editingExpenseCategory && categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = categories.map(c => c === editingExpenseCategory ? newCategory : c).sort();
            setEditingExpenseCategory(null);
        } else {
            if (categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = [...categories, newCategory].sort();
        }

        try {
            const updated = await upsertProfile({ id: profile.id, expenseCategories: newCategories });
            setProfile(updated);
            setExpenseCategoryInput('');
        } catch (err: any) {
            console.error('[Settings] Save expense category failed:', err);
            alert('Gagal menyimpan kategori: ' + (err?.message || 'Coba lagi.'));
        }
    };

    const handleEditExpenseCategory = (category: string) => { setEditingExpenseCategory(category); setExpenseCategoryInput(category); };
    const handleDeleteExpenseCategory = async (category: string) => {
        const isCategoryInUse = transactions.some(t => t.category === category && t.type === 'Pengeluaran');
        if (isCategoryInUse) {
            alert(`Kategori "${category}" tidak dapat dihapus karena sedang digunakan dalam transaksi.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus kategori "${category}"?`)) {
            const newCategories = (profile.expenseCategories || []).filter(c => c !== category);
            try {
                const updated = await upsertProfile({ id: profile.id, expenseCategories: newCategories });
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete expense category failed:', err);
                alert('Gagal menghapus kategori: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    const handleAddOrUpdateProjectType = async () => {
        if (!projectTypeInput.trim()) return;
        const newType = projectTypeInput.trim();
        const types = profile.projectTypes || [];
        let newTypes: string[];
        if (editingProjectType) {
            if (newType !== editingProjectType && types.includes(newType)) { alert('Jenis acara ini sudah ada.'); return; }
            newTypes = types.map(t => t === editingProjectType ? newType : t).sort();
        } else {
            if (types.includes(newType)) { alert('Jenis acara ini sudah ada.'); return; }
            newTypes = [...types, newType].sort();
        }
        try {
            const updated = await upsertProfile({ id: profile.id, projectTypes: newTypes } as any);
            setProfile(updated);
            setEditingProjectType(null);
            setProjectTypeInput('');
        } catch (err: any) {
            console.error('[Settings] Save project type failed:', err);
            alert('Gagal menyimpan jenis acara: ' + (err?.message || 'Coba lagi.'));
        }
    };

    const handleEditProjectType = (type: string) => { setEditingProjectType(type); setProjectTypeInput(type); };
    const handleDeleteProjectType = async (type: string) => {
        const isTypeInUse = projects.some(p => p.projectType === type);
        if (isTypeInUse) { alert(`Jenis acara "${type}" tidak dapat dihapus karena sedang digunakan.`); return; }
        if (window.confirm(`Yakin ingin menghapus jenis acara "${type}"?`)) {
            const newTypes = (profile.projectTypes || []).filter(t => t !== type);
            try {
                const updated = await upsertProfile({ id: profile.id, projectTypes: newTypes } as any);
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete project type failed:', err);
                alert('Gagal menghapus jenis acara: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    const handleAddOrUpdateEventType = async () => {
        if (!eventTypeInput.trim()) return;
        const newType = eventTypeInput.trim();
        const types = profile.eventTypes || [];
        let newTypes: string[];
        if (editingEventType) {
            if (newType !== editingEventType && types.includes(newType)) { alert('Jenis acara ini sudah ada.'); return; }
            newTypes = types.map(t => t === editingEventType ? newType : t).sort();
        } else {
            if (types.includes(newType)) { alert('Jenis acara ini sudah ada.'); return; }
            newTypes = [...types, newType].sort();
        }
        try {
            const updated = await upsertProfile({ id: profile.id, eventTypes: newTypes } as any);
            setProfile(updated);
            setEditingEventType(null);
            setEventTypeInput('');
        } catch (err: any) {
            console.error('[Settings] Save event type failed:', err);
            alert('Gagal menyimpan jenis acara: ' + (err?.message || 'Coba lagi.'));
        }
    };
    const handleEditEventType = (type: string) => { setEditingEventType(type); setEventTypeInput(type); };
    const handleDeleteEventType = async (type: string) => {
        const isTypeInUse = projects.some(p => p.clientName === 'Acara Internal' && p.projectType === type);
        if (isTypeInUse) { alert(`Jenis acara "${type}" tidak dapat dihapus karena sedang digunakan di kalender.`); return; }
        if (window.confirm(`Yakin ingin menghapus jenis acara "${type}"?`)) {
            const newTypes = (profile.eventTypes || []).filter(t => t !== type);
            try {
                const updated = await upsertProfile({ id: profile.id, eventTypes: newTypes } as any);
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete event type failed:', err);
                alert('Gagal menghapus jenis acara: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    const handleAddOrUpdatePackageCategory = async () => {
        if (!packageCategoryInput.trim()) return;
        const newCat = packageCategoryInput.trim();
        const cats = profile.packageCategories || [];
        let newCats: string[];
        if (editingPackageCategory) {
            if (newCat !== editingPackageCategory && cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            newCats = cats.map(c => c === editingPackageCategory ? newCat : c).sort();
        } else {
            if (cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            newCats = [...cats, newCat].sort();
        }
        try {
            const updated = await upsertProfile({ id: profile.id, packageCategories: newCats } as any);
            setProfile(updated);
            setEditingPackageCategory(null);
            setPackageCategoryInput('');
        } catch (err: any) {
            console.error('[Settings] Save package category failed:', err);
            alert('Gagal menyimpan kategori paket: ' + (err?.message || 'Coba lagi.'));
        }
    };
    const handleEditPackageCategory = (cat: string) => { setEditingPackageCategory(cat); setPackageCategoryInput(cat); };
    const handleDeletePackageCategory = async (cat: string) => {
        const isUsed = packages.some(p => p.category === cat);
        if (isUsed) { alert(`Kategori "${cat}" tidak dapat dihapus karena sedang digunakan oleh paket.`); return; }
        if (window.confirm(`Yakin ingin menghapus kategori paket "${cat}"?`)) {
            const newCats = (profile.packageCategories || []).filter(c => c !== cat);
            try {
                const updated = await upsertProfile({ id: profile.id, packageCategories: newCats } as any);
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete package category failed:', err);
                alert('Gagal menghapus kategori paket: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    // --- Tambah dari saran default (hanya yang belum ada) ---
    const mergeSuggested = async (current: string[], suggested: string[], key: keyof Profile) => {
        const set = new Set(current || []);
        const toAdd = suggested.filter(s => !set.has(s));
        if (toAdd.length === 0) return;
        const newList = [...(current || []), ...toAdd].sort();
        try {
            const updated = await upsertProfile({ id: profile.id, [key]: newList } as any);
            setProfile(updated);
        } catch (err: any) {
            console.error('[Settings] Merge suggested failed:', err);
            alert('Gagal menambah dari saran: ' + (err?.message || 'Coba lagi.'));
        }
    };
    const handleAddSuggestedIncome = () => mergeSuggested(profile.incomeCategories || [], DEFAULT_INCOME_CATEGORIES, 'incomeCategories');
    const handleAddSuggestedExpense = () => mergeSuggested(profile.expenseCategories || [], DEFAULT_EXPENSE_CATEGORIES, 'expenseCategories');
    const handleAddSuggestedProjectTypes = () => mergeSuggested(profile.projectTypes || [], DEFAULT_PROJECT_TYPES, 'projectTypes');
    const handleAddSuggestedEventTypes = () => mergeSuggested(profile.eventTypes || [], DEFAULT_EVENT_TYPES, 'eventTypes');
    const handleAddSuggestedPackageCategories = () => mergeSuggested(profile.packageCategories || [], DEFAULT_PACKAGE_CATEGORIES, 'packageCategories');

    const handleAddDefaultProjectStatuses = async () => {
        const current = profile.projectStatusConfig || [];
        const existingNames = new Set(current.map(s => s.name));
        const toAdd = DEFAULT_PROJECT_STATUS_SUGGESTIONS.filter(s => !existingNames.has(s.name)).map(s => ({
            id: crypto.randomUUID(),
            name: s.name,
            color: s.color,
            defaultProgress: s.defaultProgress,
            note: s.note,
            subStatuses: (s.subStatuses || []).map(sub => ({ name: sub.name, note: sub.note })),
        }));
        if (toAdd.length === 0) return;
        const newConfig = [...current, ...toAdd];
        setProfile(prev => ({ ...prev, projectStatusConfig: newConfig }));
        try {
            await upsertProfile({ id: profile.id, projectStatusConfig: newConfig } as any);
        } catch (err: any) {
            console.error('[Settings] Add default statuses failed:', err);
            alert('Gagal menambah status default: ' + (err?.message || 'Coba lagi.'));
        }
    };

    useEffect(() => {
        if (didInitProjectStatuses) return;
        if (!profile?.id) return;
        if (currentUser?.role !== 'Admin') return;
        if ((profile.projectStatusConfig || []).length > 0) {
            setDidInitProjectStatuses(true);
            return;
        }

        setDidInitProjectStatuses(true);
        handleAddDefaultProjectStatuses();
    }, [didInitProjectStatuses, profile?.id, (profile.projectStatusConfig || []).length, currentUser?.role]);

    const tabs = [
        { id: 'profile', label: 'Profil Saya', icon: UsersIcon, adminOnly: false },
        { id: 'users', label: 'Pengguna', icon: KeyIcon, adminOnly: true },
        { id: 'categories', label: 'Kustomisasi Kategori', icon: ListIcon, adminOnly: false },
        { id: 'projectStatus', label: 'Status Acara', icon: FolderKanbanIcon, adminOnly: true },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <form onSubmit={handleSubmit} className="form-compact form-compact--ios-scale">
                        <div className="space-y-4 md:space-y-6">
                            <h3 className="text-sm md:text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-2 md:pb-3">Informasi Publik</h3>
                            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="input-group"><input id="fullName" type="text" name="fullName" value={profile.fullName || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="fullName" className="input-label">Nama Lengkap</label></div>
                                    <div className="input-group"><input id="companyName" type="text" name="companyName" value={profile.companyName || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="companyName" className="input-label">Nama Perusahaan</label></div>
                                    <div className="input-group"><input id="email" type="email" name="email" value={profile.email || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="email" className="input-label">Email</label></div>
                                    <div className="input-group"><input id="phone" type="tel" name="phone" value={profile.phone || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="phone" className="input-label">Telepon</label></div>
                                    <div className="input-group"><input id="website" type="url" name="website" value={profile.website || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="website" className="input-label">Website</label></div>
                                </div>
                                <div className="input-group"><input id="address" type="text" name="address" value={profile.address || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="address" className="input-label">Alamat</label></div>
                                <div className="input-group"><input id="bankAccount" type="text" name="bankAccount" value={profile.bankAccount || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="bankAccount" className="input-label">Rekening Bank</label></div>
                                <div className="input-group"><input id="authorizedSigner" type="text" name="authorizedSigner" value={profile.authorizedSigner || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="authorizedSigner" className="input-label">Nama Penanggung Jawab Tanda Tangan</label></div>
                                <div className="input-group"><input id="idNumber" type="text" name="idNumber" value={profile.idNumber || ''} onChange={handleInputChange} className="input-field" placeholder=" " /><label htmlFor="idNumber" className="input-label">No. KTP Penanggung Jawab</label></div>
                                <div className="input-group"><textarea id="bio" name="bio" value={profile.bio || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={3}></textarea><label htmlFor="bio" className="input-label">Bio Perusahaan</label></div>
                                <div>
                                    <div className="input-group"><textarea id="briefingTemplate" name="briefingTemplate" value={profile.briefingTemplate || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={3}></textarea><label htmlFor="briefingTemplate" className="input-label">Template Pesan Briefing Tim</label></div>
                                    <p className="text-xs text-brand-text-secondary mt-1">Ditambahkan di akhir pesan saat membagikan briefing acara ke tim via WhatsApp.</p>
                                    <button type="button" onClick={() => setProfile(p => ({ ...p, briefingTemplate: DEFAULT_BRIEFING_TEMPLATE }))} className="text-xs text-brand-accent hover:underline mt-2">+ Gunakan contoh</button>
                                </div>
                            </div>

                            <h3 className="text-sm md:text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-2 md:pb-3 mt-6 md:mt-8">Branding & Kustomisasi</h3>
                            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto">
                                <div>
                                    <label htmlFor="logoUpload" className="text-xs md:text-sm font-medium text-brand-text-secondary">Logo Perusahaan (u/ Invoice)</label>
                                    <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                                        {profile.logoBase64 ?
                                            <img src={profile.logoBase64} alt="Logo preview" className="h-12 w-12 md:h-16 md:w-16 object-contain rounded-md bg-brand-bg p-1 border border-brand-border flex-shrink-0" />
                                            : <div className="h-12 w-12 md:h-16 md:w-16 rounded-md bg-brand-bg border border-brand-border flex items-center justify-center text-[10px] md:text-xs text-brand-text-secondary flex-shrink-0">No Logo</div>
                                        }
                                        <input
                                            id="logoUpload"
                                            type="file"
                                            name="logoBase64"
                                            onChange={handleLogoChange}
                                            className="block w-full text-xs md:text-sm text-brand-text-secondary file:mr-2 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                                            accept="image/png, image/jpeg, image/svg+xml"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="signatureUpload" className="text-xs md:text-sm font-medium text-brand-text-secondary">Tanda Tangan (TTD) - untuk Invoice, Kontrak, Slip Gaji</label>
                                    <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                                        {profile.signatureBase64 ?
                                            <img src={profile.signatureBase64} alt="TTD preview" className="h-16 w-24 md:h-20 md:w-32 object-contain rounded-md bg-white p-1 border border-brand-border flex-shrink-0" />
                                            : <div className="h-16 w-24 md:h-20 md:w-32 rounded-md bg-brand-bg border border-brand-border flex items-center justify-center text-[10px] md:text-xs text-brand-text-secondary flex-shrink-0 text-center px-1">Belum Upload TTD</div>
                                        }
                                        <div className="flex flex-col gap-1">
                                            <input
                                                id="signatureUpload"
                                                type="file"
                                                name="signatureBase64"
                                                onChange={handleSignatureChange}
                                                className="block w-full text-xs md:text-sm text-brand-text-secondary file:mr-2 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                                                accept="image/png, image/jpeg, image/webp"
                                            />
                                            <p className="text-[10px] md:text-xs text-brand-text-secondary">Upload gambar TTD Anda. TTD ini akan otomatis digunakan saat menandatangani invoice, kontrak, dan slip gaji.</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="brandColor" className="text-xs md:text-sm font-medium text-brand-text-secondary">Warna Aksen Merek</label>
                                    <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                                        <div className="relative flex-shrink-0">
                                            <input
                                                id="brandColor"
                                                type="color"
                                                name="brandColor"
                                                value={profile.brandColor || '#3b82f6'}
                                                onChange={handleInputChange}
                                                className="w-12 h-8 md:w-16 md:h-10 p-1 bg-brand-bg border border-brand-border rounded-md cursor-pointer"
                                            />
                                        </div>
                                        <p className="text-xs md:text-sm text-brand-text-secondary">Pilih warna yang mewakili merek Anda. Warna ini akan diterapkan di seluruh aplikasi, portal pengantin, dan dokumen.</p>
                                    </div>
                                </div>
                                <div>
                                    <div className="input-group !mt-6"><textarea id="termsAndConditions" name="termsAndConditions" value={profile.termsAndConditions || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={15}></textarea><label htmlFor="termsAndConditions" className="input-label">Syarat & Ketentuan (u/ Invoice)</label></div>
                                    <button type="button" onClick={() => setProfile(p => ({ ...p, termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS }))} className="text-xs text-brand-accent hover:underline mt-2">+ Gunakan contoh</button>
                                </div>
                                <h4 className="text-sm font-semibold text-brand-text-light mt-6 mb-2">Template WhatsApp (Prospek/Leads)</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Digunakan saat membagikan link paket atau form booking ke prospek dari halaman Prospek.</p>
                                <div>
                                    <div className="input-group !mt-2"><textarea id="packageShareTemplate" name="packageShareTemplate" value={profile.packageShareTemplate || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={5}></textarea><label htmlFor="packageShareTemplate" className="input-label">Template Bagikan Paket</label></div>
                                    <p className="text-xs text-brand-text-secondary mt-1">Placeholder: {`{leadName}`}, {`{companyName}`}, {`{packageLink}`}</p>
                                    <button type="button" onClick={() => setProfile(p => ({ ...p, packageShareTemplate: DEFAULT_PACKAGE_SHARE_TEMPLATE }))} className="text-xs text-brand-accent hover:underline mt-2">+ Gunakan contoh</button>
                                </div>
                                <div className="mt-4">
                                    <div className="input-group !mt-2"><textarea id="bookingFormTemplate" name="bookingFormTemplate" value={profile.bookingFormTemplate || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={5}></textarea><label htmlFor="bookingFormTemplate" className="input-label">Template Kirim Form Booking</label></div>
                                    <p className="text-xs text-brand-text-secondary mt-1">Placeholder: {`{leadName}`}, {`{companyName}`}, {`{bookingFormLink}`}</p>
                                    <button type="button" onClick={() => setProfile(p => ({ ...p, bookingFormTemplate: DEFAULT_BOOKING_FORM_TEMPLATE }))} className="text-xs text-brand-accent hover:underline mt-2">+ Gunakan contoh</button>
                                </div>
                            </div>

                            <h3 className="text-sm md:text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-2 md:pb-3 mt-6 md:mt-8">Notifikasi</h3>
                            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto">
                                <div className="flex justify-between items-center gap-3"><label htmlFor="notif-newProject" className="text-xs md:text-sm">Acara Baru Dibuat</label><ToggleSwitch id="notif-newProject" enabled={!!profile.notificationSettings?.newProject} onChange={() => handleNotificationChange('newProject')} /></div>
                                <div className="flex justify-between items-center gap-3"><label htmlFor="notif-paymentConfirmation" className="text-xs md:text-sm">Konfirmasi Pembayaran Diterima</label><ToggleSwitch id="notif-paymentConfirmation" enabled={!!profile.notificationSettings?.paymentConfirmation} onChange={() => handleNotificationChange('paymentConfirmation')} /></div>
                                <div className="flex justify-between items-center gap-3"><label htmlFor="notif-deadlineReminder" className="text-xs md:text-sm">Pengingat Deadline Acara</label><ToggleSwitch id="notif-deadlineReminder" enabled={!!profile.notificationSettings?.deadlineReminder} onChange={() => handleNotificationChange('deadlineReminder')} /></div>
                            </div>

                            <h3 className="text-sm md:text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-2 md:pb-3 mt-6 md:mt-8">Keamanan</h3>
                            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto">
                                <div className="flex justify-between items-center gap-3"><label htmlFor="security-2fa" className="text-xs md:text-sm">Autentikasi Dua Faktor (2FA)</label><ToggleSwitch id="security-2fa" enabled={!!profile.securitySettings?.twoFactorEnabled} onChange={() => setProfile(p => ({ ...p, securitySettings: { twoFactorEnabled: !(p.securitySettings?.twoFactorEnabled ?? false) } }))} /></div>
                            </div>

                            {saveError && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                                    {saveError}
                                </div>
                            )}
                            <div className="text-right mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-700/50">
                                <button type="submit" className="button-primary relative w-full md:w-auto" disabled={isSaving || !profile?.id}>
                                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    {showSuccess && <span className="absolute -right-4 -top-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-fade-in-out">✓</span>}
                                </button>
                                {!profile?.id && (
                                    <p className="text-xs text-brand-text-secondary mt-2">Profil sedang dimuat dari server. Tunggu sebentar lalu coba lagi.</p>
                                )}
                            </div>
                        </div>
                    </form>
                );
            case 'users':
                if (currentUser?.role !== 'Admin') return <p className="text-sm md:text-base text-brand-text-secondary">Anda tidak memiliki akses ke halaman ini.</p>;
                return (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
                            <h3 className="text-sm md:text-lg font-semibold text-brand-text-light">Manajemen Pengguna</h3>
                            <button onClick={() => handleOpenUserModal('add')} className="button-primary inline-flex items-center gap-2 w-full sm:w-auto text-sm md:text-base"><PlusIcon className="w-4 h-4 md:w-5 md:h-5" />Tambah Pengguna</button>
                        </div>
                        <div className="space-y-2 md:space-y-3">
                            {users.map(user => (
                                <div key={user.id} className="p-3 md:p-4 bg-brand-bg rounded-lg flex justify-between items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm md:text-base text-brand-text-light truncate">{user.fullName}</p>
                                        <p className="text-xs md:text-sm text-brand-text-secondary truncate">{user.email} - <span className="font-medium">{user.role}</span></p>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                                        <button onClick={() => handleOpenUserModal('edit', user)} className="p-1.5 md:p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 md:p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-4 h-4 md:w-5 md:h-5" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'categories':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                        <CategoryManager
                            title="Kategori Pemasukan"
                            categories={profile.incomeCategories}
                            inputValue={incomeCategoryInput}
                            onInputChange={setIncomeCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateIncomeCategory}
                            onEdit={handleEditIncomeCategory}
                            onDelete={handleDeleteIncomeCategory}
                            editingValue={editingIncomeCategory}
                            onCancelEdit={() => { setEditingIncomeCategory(null); setIncomeCategoryInput(''); }}
                            placeholder="e.g., DP Acara"
                            suggestedDefaults={DEFAULT_INCOME_CATEGORIES}
                            onAddSuggested={handleAddSuggestedIncome}
                        />
                        <CategoryManager
                            title="Kategori Pengeluaran"
                            categories={profile.expenseCategories}
                            inputValue={expenseCategoryInput}
                            onInputChange={setExpenseCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateExpenseCategory}
                            onEdit={handleEditExpenseCategory}
                            onDelete={handleDeleteExpenseCategory}
                            editingValue={editingExpenseCategory}
                            onCancelEdit={() => { setEditingExpenseCategory(null); setExpenseCategoryInput(''); }}
                            placeholder="e.g., Gaji Freelancer"
                            suggestedDefaults={DEFAULT_EXPENSE_CATEGORIES}
                            onAddSuggested={handleAddSuggestedExpense}
                        />
                        <CategoryManager
                            title="Jenis Acara"
                            categories={profile.projectTypes}
                            inputValue={projectTypeInput}
                            onInputChange={setProjectTypeInput}
                            onAddOrUpdate={handleAddOrUpdateProjectType}
                            onEdit={handleEditProjectType}
                            onDelete={handleDeleteProjectType}
                            editingValue={editingProjectType}
                            onCancelEdit={() => { setEditingProjectType(null); setProjectTypeInput(''); }}
                            placeholder="e.g., Pernikahan"
                            suggestedDefaults={DEFAULT_PROJECT_TYPES}
                            onAddSuggested={handleAddSuggestedProjectTypes}
                        />
                        <CategoryManager
                            title="Jenis Acara Internal"
                            categories={profile.eventTypes}
                            inputValue={eventTypeInput}
                            onInputChange={setEventTypeInput}
                            onAddOrUpdate={handleAddOrUpdateEventType}
                            onEdit={handleEditEventType}
                            onDelete={handleDeleteEventType}
                            editingValue={editingEventType}
                            onCancelEdit={() => { setEditingEventType(null); setEventTypeInput(''); }}
                            placeholder="e.g., Meeting Pengantin"
                            suggestedDefaults={DEFAULT_EVENT_TYPES}
                            onAddSuggested={handleAddSuggestedEventTypes}
                        />
                        <CategoryManager
                            title="Kategori Paket"
                            categories={profile.packageCategories || []}
                            inputValue={packageCategoryInput}
                            onInputChange={setPackageCategoryInput}
                            onAddOrUpdate={handleAddOrUpdatePackageCategory}
                            onEdit={handleEditPackageCategory}
                            onDelete={handleDeletePackageCategory}
                            editingValue={editingPackageCategory}
                            onCancelEdit={() => { setEditingPackageCategory(null); setPackageCategoryInput(''); }}
                            placeholder="e.g., Pernikahan"
                            suggestedDefaults={DEFAULT_PACKAGE_CATEGORIES}
                            onAddSuggested={handleAddSuggestedPackageCategories}
                        />
                    </div>
                );
            case 'projectStatus':
                if (currentUser?.role !== 'Admin') return <p className="text-sm md:text-base text-brand-text-secondary">Anda tidak memiliki akses ke halaman ini.</p>;
                return (
                    <ProjectStatusManager
                        config={profile.projectStatusConfig}
                        onConfigChange={(newConfig) => setProfile(prev => ({ ...prev, projectStatusConfig: newConfig }))}
                        projects={projects}
                        profile={profile}
                        onAddDefaultStatuses={handleAddDefaultProjectStatuses}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <PageHeader title="Pengaturan" subtitle="Kelola profil, pengguna, dan kustomisasi aplikasi Anda." icon={<SettingsIcon className="w-6 h-6" />} />

            {/* Mobile Tab Navigation - Horizontal Scroll */}
            <div className="lg:hidden">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0">
                    {tabs
                        .filter(tab => !(tab.adminOnly && currentUser?.role !== 'Admin'))
                        .map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30'
                                    : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="whitespace-nowrap">{tab.label}</span>
                            </button>
                        ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                {/* Desktop Sidebar Navigation */}
                <aside className="hidden lg:block lg:col-span-1">
                    <nav className="space-y-1 sticky top-24">
                        {tabs
                            .filter(tab => !(tab.adminOnly && currentUser?.role !== 'Admin'))
                            .map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 text-left ${activeTab === tab.id
                                        ? 'bg-brand-accent text-white shadow-lg'
                                        : 'text-brand-text-secondary hover:bg-brand-input hover:text-brand-text-light'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5 mr-3" />
                                    {tab.label}
                                </button>
                            ))}
                    </nav>
                </aside>
                <main className="lg:col-span-3 bg-brand-surface p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl shadow-lg min-h-[60vh]">
                    {renderTabContent()}
                </main>
            </div>

            <Modal isOpen={isUserModalOpen} onClose={handleCloseUserModal} title={userModalMode === 'add' ? 'Tambah Pengguna Baru' : 'Edit Pengguna'}>
                <form onSubmit={handleUserFormSubmit} className="space-y-4 form-compact form-compact--ios-scale">
                    {userFormError && <p className="text-red-500 text-sm bg-red-500/10 p-3 rounded-md">{userFormError}</p>}

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                            <KeyIcon className="w-4 h-4" />
                            Informasi Pengguna
                        </h4>
                        <p className="text-xs text-brand-text-secondary">
                            Tambahkan pengguna baru yang dapat mengakses sistem. Atur peran dan izin akses sesuai kebutuhan.
                        </p>
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold text-brand-text-light mb-3">Data Pribadi</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="input-group">
                                <input type="text" name="fullName" value={userForm.fullName} onChange={handleUserFormChange} className="input-field" placeholder=" " required />
                                <label className="input-label">Nama Lengkap</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Nama lengkap pengguna</p>
                            </div>
                            <div className="input-group">
                                <input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} className="input-field" placeholder=" " required />
                                <label className="input-label">Email</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Email untuk login ke sistem</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold text-brand-text-light mb-3">Keamanan</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="input-group">
                                <input type="password" name="password" value={userForm.password} onChange={handleUserFormChange} className="input-field" placeholder=" " required={userModalMode === 'add'} />
                                <label className="input-label">{userModalMode === 'add' ? 'Kata Sandi' : 'Kata Sandi Baru'}</label>
                                <p className="text-xs text-brand-text-secondary mt-1">{userModalMode === 'add' ? 'Minimal 6 karakter' : 'Kosongkan jika tidak berubah'}</p>
                            </div>
                            <div className="input-group">
                                <input type="password" name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserFormChange} className="input-field" placeholder=" " required={!!userForm.password} />
                                <label className="input-label">Konfirmasi Kata Sandi</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Ketik ulang kata sandi</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold text-brand-text-light mb-3">Peran & Izin Akses</h5>
                        <div className="input-group">
                            <select name="role" value={userForm.role} onChange={handleUserFormChange} className="input-field">
                                <option value="Member">Member</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <label className="input-label">Peran</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Admin memiliki akses penuh, Member dapat dikustomisasi</p>
                        </div>
                    </div>

                    {userForm.role === 'Member' && (
                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-border">
                            <h5 className="text-sm font-semibold text-brand-text-light mb-3">Izin Akses Halaman</h5>
                            <p className="text-xs text-brand-text-secondary mb-3">Pilih halaman mana saja yang dapat diakses oleh pengguna ini</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {NAV_ITEMS.filter(item => item.view !== ViewType.SETTINGS).map(item => (
                                    <label key={item.view} className="flex items-center gap-2 p-2 rounded-md hover:bg-brand-input cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={userForm.permissions.includes(item.view)}
                                            onChange={e => handlePermissionsChange(item.view, e.target.checked)}
                                            className="h-4 w-4 rounded flex-shrink-0 text-brand-accent focus:ring-brand-accent transition-colors"
                                        />
                                        <span className="text-sm text-brand-text-primary">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseUserModal} className="button-secondary w-full sm:w-auto">Batal</button>
                        <button type="submit" className="button-primary w-full sm:w-auto">{userModalMode === 'add' ? 'Simpan Pengguna' : 'Update Pengguna'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Settings;