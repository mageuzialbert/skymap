'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/roles';
import { Filter, Loader2, Plus, Receipt } from 'lucide-react';
import Alert from '@/components/common/Alert';
import FormSheet from '@/components/common/FormSheet';
import { EmptyState, RecordList, RecordRow } from '@/components/common/RecordList';
import { useT } from '@/lib/i18n';
import { cardClass, fieldLabel, inputClass, pageTitle } from '@/lib/ui';

interface Expense {
  id: string;
  category_id: string;
  amount: number;
  description: string | null;
  supplier: string | null;
  expense_date: string;
  created_by: string;
  created_at: string;
  expense_categories?: {
    id: string;
    name: string;
  };
  users?: {
    id: string;
    name: string;
  };
}

interface ExpenseCategory {
  id: string;
  name: string;
  active?: boolean;
}

interface ExpenseFormData {
  category_id: string;
  amount: string;
  description: string;
  supplier: string;
  expense_date: string;
}

export default function AdminExpensesPage() {
  const router = useRouter();
  const t = useT();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category_id: '',
    start_date: '',
    end_date: '',
  });

  const [formData, setFormData] = useState<ExpenseFormData>({
    category_id: '',
    amount: '',
    description: '',
    supplier: '',
    expense_date: new Date().toISOString().split('T')[0],
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
      loadExpenses();
    }
    checkRole();
  }, [router]);

  async function loadCategories() {
    try {
      const response = await fetch('/api/admin/expense-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.filter((c: ExpenseCategory) => c.active));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async function loadExpenses() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category_id) params.set('category_id', filters.category_id);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      params.set('limit', '1000');

      const response = await fetch(`/api/admin/expenses?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role) {
      loadExpenses();
    }
  }, [filters, role]);

  function handleNewExpense() {
    setEditingExpense(null);
    setFormData({
      category_id: '',
      amount: '',
      description: '',
      supplier: '',
      expense_date: new Date().toISOString().split('T')[0],
    });
    setError('');
    setShowForm(true);
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    setFormData({
      category_id: expense.category_id,
      amount: expense.amount.toString(),
      description: expense.description || '',
      supplier: expense.supplier || '',
      expense_date: expense.expense_date,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!formData.category_id) {
        throw new Error(t('admin.expenses.categoryRequired'));
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error(t('admin.expenses.amountError'));
      }

      const url = editingExpense
        ? `/api/admin/expenses/${editingExpense.id}`
        : '/api/admin/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: formData.category_id,
          amount: amount,
          description: formData.description || null,
          supplier: formData.supplier || null,
          expense_date: formData.expense_date,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('admin.expenses.errSave'));
      }

      setShowForm(false);
      setEditingExpense(null);
      loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.expenses.errSave'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(expense: Expense) {
    if (!confirm(t('admin.expenses.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/expenses/${expense.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('admin.expenses.errDelete'));
      }

      loadExpenses();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.expenses.errDelete'));
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  if (loading && expenses.length === 0) {
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
          <h1 className={pageTitle}>{t('admin.expenses.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.expenses.subtitle')}</p>
        </div>
        <button
          onClick={handleNewExpense}
          className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('admin.expenses.new')}</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className={`${cardClass} p-6 mb-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-gray-600">{t('admin.expenses.total')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {expenses.length === 1
              ? t('admin.expenses.countOne', { count: expenses.length })
              : t('admin.expenses.countMany', { count: expenses.length })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`${cardClass} p-4 mb-6`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('admin.expenses.filters')}</span>
          </div>
          <select
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className={inputClass}
          >
            <option value="">{t('admin.expenses.allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            placeholder={t('admin.expenses.startDate')}
            className={inputClass}
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            placeholder={t('admin.expenses.endDate')}
            className={inputClass}
          />
          {(filters.category_id || filters.start_date || filters.end_date) && (
            <button
              onClick={() => setFilters({ category_id: '', start_date: '', end_date: '' })}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {t('admin.expenses.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {error && !showForm && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title={t('admin.expenses.empty')} />
      ) : (
        <RecordList>
          {expenses.map((expense) => (
            <RecordRow
              key={expense.id}
              title={expense.expense_categories?.name || t('admin.common.unknown')}
              trailing={formatCurrency(parseFloat(expense.amount.toString()))}
              subtitle={expense.description || expense.supplier || '—'}
              meta={formatDate(expense.expense_date)}
              actions={
                <>
                  <ExpenseAction onClick={() => handleEdit(expense)}>
                    {t('common.edit')}
                  </ExpenseAction>
                  {role === 'ADMIN' && (
                    <ExpenseAction onClick={() => handleDelete(expense)} tone="danger">
                      {t('common.delete')}
                    </ExpenseAction>
                  )}
                </>
              }
            />
          ))}
        </RecordList>
      )}

      <FormSheet
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingExpense(null);
          setError('');
        }}
        onSubmit={() => handleSubmit()}
        submitting={submitting}
        error={error}
        title={editingExpense ? t('admin.expenses.editTitle') : t('admin.expenses.newTitle')}
        submitLabel={editingExpense ? t('admin.expenses.update') : t('admin.expenses.create')}
      >
              <div>
                <label className={fieldLabel}>{t('admin.expenses.categoryLabel')}</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                  className={inputClass}
                >
                  <option value="">{t('admin.expenses.selectCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={fieldLabel}>
                  {t('admin.expenses.amountLabel')}
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  step="0.01"
                  min="0"
                  className={inputClass}
                  placeholder="0.00"
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
                  placeholder={t('admin.expenses.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className={fieldLabel}>
                  {t('admin.expenses.supplierLabel')}
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className={inputClass}
                  placeholder={t('admin.expenses.supplierPlaceholder')}
                />
              </div>

              <div>
                <label className={fieldLabel}>
                  {t('admin.expenses.expenseDate')}
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>

      </FormSheet>
    </div>
  );
}

/** A small secondary action under an expense row. */
function ExpenseAction({
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
