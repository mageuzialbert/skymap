'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/roles';
import {
  Loader2,
  Save,
  MessageSquare,
  User,
  Shield,
  Bike,
  ToggleLeft,
  ToggleRight,
  Edit3,
  X,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface SmsTemplate {
  id: string;
  event_key: string;
  audience: 'client' | 'admin' | 'rider';
  name: string;
  body: string;
  tags: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

const audienceConfig = {
  client: {
    label: 'Client',
    icon: User,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    headerColor: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    headerColor: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
  },
  rider: {
    label: 'Rider',
    icon: Bike,
    color: 'bg-green-100 text-green-700 border-green-200',
    headerColor: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
  },
};

export default function SmsTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const role = await getUserRole();
      if (role !== 'ADMIN') {
        router.push('/dashboard/business');
        return;
      }
      loadTemplates();
    }
    init();
  }, [router]);

  async function loadTemplates() {
    try {
      const res = await fetch('/api/admin/sms/templates');
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(template: SmsTemplate) {
    setTogglingId(template.id);
    try {
      const res = await fetch(`/api/admin/sms/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !template.active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, active: !t.active } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    } finally {
      setTogglingId(null);
    }
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sms/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? { ...t, body: updated.body } : t))
      );
      setEditingTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(template: SmsTemplate) {
    setEditingTemplate(template);
    setEditBody(template.body);
  }

  const groupedTemplates = {
    client: templates.filter((t) => t.audience === 'client'),
    admin: templates.filter((t) => t.audience === 'admin'),
    rider: templates.filter((t) => t.audience === 'rider'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">SMS Templates</h1>
          <p className="text-gray-600 mt-1">
            Manage predefined SMS templates. Toggle auto-sending for each event.
          </p>
        </div>
        <Link
          href="/dashboard/admin/sms/send"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <MessageSquare className="w-4 h-4" />
          Send Custom SMS
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Template Groups */}
      {(['client', 'admin', 'rider'] as const).map((audience) => {
        const config = audienceConfig[audience];
        const Icon = config.icon;
        const items = groupedTemplates[audience];

        return (
          <div key={audience} className="mb-8">
            <div
              className={`flex items-center gap-3 p-3 rounded-t-lg border ${config.headerColor}`}
            >
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
              <h2 className="text-lg font-semibold text-gray-900">
                {config.label} Templates
              </h2>
              <span className="text-sm text-gray-500">({items.length})</span>
            </div>

            <div className="border border-t-0 border-gray-200 rounded-b-lg divide-y divide-gray-100">
              {items.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No templates for this audience.
                </div>
              ) : (
                items.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {template.name}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}
                          >
                            {template.event_key}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 font-mono">
                          {template.body}
                        </p>
                        {template.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <Tag className="w-3 h-3 text-gray-400" />
                            {template.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-mono"
                              >
                                {`{{${tag}}}`}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEdit(template)}
                          className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Edit template"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(template)}
                          disabled={togglingId === template.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            template.active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={template.active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {togglingId === template.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : template.active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                          {template.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Template: {editingTemplate.name}
              </h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Body
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-mono"
                />
              </div>

              {editingTemplate.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Tags (click to insert)
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {editingTemplate.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setEditBody((prev) => prev + `{{${tag}}}`)}
                        className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200 font-mono hover:bg-amber-100 transition-colors"
                      >
                        {`{{${tag}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
