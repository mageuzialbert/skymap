'use client';

interface AboutSectionProps {
  content: {
    title?: string;
    description?: string;
    features?: string[];
  } | null;
}

export default function AboutSection({ content }: AboutSectionProps) {
  const defaultContent = {
    title: 'About Kasi Courier Services',
    description: 'Your trusted B2B logistics partner delivering excellence across Tanzania. We connect businesses with reliable, efficient delivery solutions.',
    features: [
      'Fast and Reliable Delivery',
      'Real-time Tracking',
      'Weekly Billing',
      'Professional Service'
    ]
  };

  const displayContent = content || defaultContent;

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {displayContent.title}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            {displayContent.description}
          </p>
        </div>

        {displayContent.features && displayContent.features.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {displayContent.features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 bg-primary rounded"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
