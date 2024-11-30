import dynamic from 'next/dynamic';

function LoadingSpinner() {
  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  );
}

const ClientPage = dynamic(() => import('../components/ClientPage'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function Home() {
  return <ClientPage />;
}
