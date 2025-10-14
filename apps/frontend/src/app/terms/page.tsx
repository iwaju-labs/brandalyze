import { Footer } from '@/components/layout/footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Terms of Service</h1>
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Terms of service will be updated before launch. Currently in development.
          </p>
        </div>
      </div>
      <Footer variant="default" />
    </div>
  );
}
