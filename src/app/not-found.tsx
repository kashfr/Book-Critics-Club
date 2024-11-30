import dynamic from 'next/dynamic';

function LoadingSpinner() {
  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  );
}

const ClientNotFound = dynamic(() => import('../components/ClientNotFound'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function NotFound() {
  return <ClientNotFound />;
}
