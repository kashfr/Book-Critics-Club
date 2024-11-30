import dynamic from 'next/dynamic';

const ClientNotFound = dynamic(() => import('../components/ClientNotFound'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  ),
});

export default function NotFound() {
  return <ClientNotFound />;
}
