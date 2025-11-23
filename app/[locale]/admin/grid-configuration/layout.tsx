import { notFound } from 'next/navigation';
import { routing } from '@/src/i18n/routing';

type Props = {
  params: Promise<{locale: string}>;
};

export default async function GridConfigurationLayout({children, params}: {children: React.ReactNode, params: Promise<{locale: string}>}) {
  // Ensure that the incoming `locale` is valid
  const {locale} = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // This layout simply passes through children for the grid configuration
  return (
    <div className="container mx-auto p-4">
      {children}
    </div>
  );
}