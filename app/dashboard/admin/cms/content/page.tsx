'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface CMSContent {
  id: string;
  key: string;
  content: any;
  updated_at: string;
}

export default function AdminContentPage() {
  const t = useT();
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
      if (!response.ok) throw new Error(t('admin.cms.content.errLoad'));
      const data = await response.json();
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.cms.content.errLoad'));
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
        throw new Error(data.error || t('admin.cms.content.errSave'));
      }

      loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.cms.content.errSave'));
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('admin.cms.content.title')}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* About Us Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('admin.cms.content.aboutHeading')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.cms.content.titleLabel')}
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
              {t('admin.cms.content.descriptionLabel')}
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
              {t('admin.cms.content.featuresLabel')}
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
              placeholder={t('admin.cms.content.featuresPlaceholder')}
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
            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving === 'about_us' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('admin.cms.content.saveAboutUs')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
