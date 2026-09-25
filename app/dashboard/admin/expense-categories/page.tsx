'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/roles';
import { Loader2, Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import FormSheet from '@/components/common/FormSheet';
import { EmptyState, RecordList, RecordRow } from '@/components/common/RecordList';
import { useT } from '@/lib/i18n';
import { activeDot, activeLabelKey, activeText } from '@/lib/userStatus';
import { fieldLabel, inputClass, pageTitle } from '@/lib/ui';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  active: boolean;
}

export default function AdminExpenseCategoriesPage() {
  const router = useRouter();
  const t = useT();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      loadCategories();
    }
    checkRole();
  }, [router]);

  async function loadCategories() {
    try {
      const response = await fetch('/api/admin/expense-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNewCategory() {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      active: true,
    });
    setError('');
    setShowForm(true);
  }

  function handleEdit(category: ExpenseCategory) {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      active: category.active,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!formData.name.trim()) {
        throw new Error(t('admin.expenseCategories.nameRequired'));
      }

      const url = editingCategory
        ? `/api/admin/expense-categories/${editingCategory.id}`
        : '/api/admin/expense-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description || null,
          active: formData.active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('admin.expenseCategories.errSave'));
      }

      setShowForm(false);
      setEditingCategory(null);
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.expenseCategories.errSave'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(category: ExpenseCategory) {
    if (!confirm(category.active ? t('admin.expenseCategories.confirmDeactivate') : t('admin.expenseCategories.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/expense-categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('admin.expenseCategories.errDelete'));
      }

      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.expenseCategories.errDelete'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>{t('admin.expenseCategories.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.expenseCategories.subtitle')}</p>
        </div>
        {role === 'ADMIN' && (
          <button
            onClick={handleNewCategory}
            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('admin.expenseCategories.new')}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState icon={FolderOpen} title={t('admin.expenseCategories.empty')} />
      ) : (
        <RecordList>
          {categories.map((category) => (
            <RecordRow
              key={category.id}
              title={category.name}
              subtitle={category.description || '—'}
              status={{
                dot: activeDot(category.active),
                text: activeText(category.active),
                label: t(activeLabelKey(category.active)),
              }}
              actions={
                role === 'ADMIN' && (
                  <>
                    <CategoryAction onClick={() => handleEdit(category)}>
                      {t('common.edit')}
                    </CategoryAction>
                    <CategoryAction onClick={() => handleDelete(category)} tone="danger">
                      {t('common.delete')}
                    </CategoryAction>
                  </>
                )
              }
            />
          ))}
        </RecordList>
      )}

      <FormSheet
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCategory(null);
          setError('');
        }}
        onSubmit={() => handleSubmit()}
        submitting={submitting}
        error={error}
        title={
          editingCategory
            ? t('admin.expenseCategories.editTitle')
            : t('admin.expenseCategories.newTitle')
        }
      >
              <div>
                <label className={fieldLabel}>
                  {t('admin.expenseCategories.nameLabel')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={inputClass}
                  placeholder={t('admin.expenseCategories.namePlaceholder')}
                />
              </div>

              <div>
                <label className={fieldLabel}>
                  {t('admin.common.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={inputClass}
                  placeholder={t('admin.expenseCategories.descriptionPlaceholder')}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  {t('admin.expenseCategories.activeLabel')}
                </label>
              </div>

      </FormSheet>
    </div>
  );
}

/** A small secondary action under a category row. */
function CategoryAction({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[2.25rem] items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${
        tone === 'danger'
          ? 'border-red-200 text-red-600 active:bg-red-50'
          : 'border-gray-200 text-gray-700 active:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}
