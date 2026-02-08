'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';

interface CMSContent {
  id: string;
  key: string;
  content: any;
  updated_at: string;
}

export default function AdminContentPage() {
  const [content, setContent] = useState<CMSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    try {
      const response = await fetch('/api/admin/cms/content');
      if (!response.ok) throw new Error('Failed to load content');
      const data = await response.json();
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }

  async function saveContent(key: string, contentData: any) {
    setSaving(key);
    setError('');

    try {
      const response = await fetch('/api/admin/cms/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, content: contentData }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save content');
      }

      loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    } finally {
      setSaving(null);
    }
  }

  function updateContent(key: string, field: string, value: any) {
    setContent((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          return {
            ...item,
            content: {
              ...item.content,
              [field]: value,
            },
          };
        }
        return item;
      })
    );
  }

  function getContent(key: string) {
    return content.find((item) => item.key === key);
  }

  const aboutContent = getContent('about_us');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage CMS Content</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* About Us Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">About Us</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={aboutContent?.content?.title || ''}
              onChange={(e) => {
                if (!aboutContent) {
                  setContent([
                    ...content,
                    {
                      id: '',
                      key: 'about_us',
                      content: { title: e.target.value },
                      updated_at: new Date().toISOString(),
                    },
                  ]);
                } else {
                  updateContent('about_us', 'title', e.target.value);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={aboutContent?.content?.description || ''}
              onChange={(e) => {
                if (!aboutContent) {
                  setContent([
                    ...content,
                    {
                      id: '',
                      key: 'about_us',
                      content: { description: e.target.value },
                      updated_at: new Date().toISOString(),
                    },
                  ]);
                } else {
                  updateContent('about_us', 'description', e.target.value);
                }
              }}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features (one per line)
            </label>
            <textarea
              value={
                aboutContent?.content?.features
                  ? aboutContent.content.features.join('\n')
                  : ''
              }
              onChange={(e) => {
                const features = e.target.value.split('\n').filter((f) => f.trim());
                if (!aboutContent) {
                  setContent([
                    ...content,
                    {
                      id: '',
                      key: 'about_us',
                      content: { features },
                      updated_at: new Date().toISOString(),
                    },
                  ]);
                } else {
                  updateContent('about_us', 'features', features);
                }
              }}
              rows={6}
              placeholder="Fast and Reliable Delivery&#10;Real-time Tracking&#10;Weekly Billing&#10;Professional Service"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              const aboutData = getContent('about_us');
              if (aboutData) {
                saveContent('about_us', aboutData.content);
              }
            }}
            disabled={saving === 'about_us'}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving === 'about_us' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save About Us</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
