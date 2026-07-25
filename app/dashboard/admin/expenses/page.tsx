'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/roles';
import { Loader2, Plus, Edit, Trash2, Filter } from 'lucide-react';
import { useT } from '@/lib/i18n';

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    return new Date(dateString).toLocaleDateString('en-US', {
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.expenses.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.expenses.subtitle')}</p>
        </div>
        <button
          onClick={handleNewExpense}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('admin.expenses.new')}
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
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
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('admin.expenses.filters')}</span>
          </div>
          <select
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            placeholder={t('admin.expenses.endDate')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.expenses.colDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.expenses.colCategory')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.common.description')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.expenses.colSupplier')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.expenses.colAmount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.expenses.colCreatedBy')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  {t('admin.expenses.empty')}
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(expense.expense_date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {expense.expense_categories?.name || t('admin.common.unknown')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{expense.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{expense.supplier || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(expense.amount.toString()))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {expense.users?.name || t('admin.common.unknown')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(expense)}
                          className="text-red-600 hover:text-red-800"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingExpense ? t('admin.expenses.editTitle') : t('admin.expenses.newTitle')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.expenses.categoryLabel')}
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.expenses.amountLabel')}
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.common.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('admin.expenses.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.expenses.supplierLabel')}
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('admin.expenses.supplierPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.expenses.expenseDate')}
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingExpense(null);
                    setError('');
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? t('common.saving') : editingExpense ? t('admin.expenses.update') : t('admin.expenses.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
