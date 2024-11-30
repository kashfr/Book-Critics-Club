import dynamic from 'next/dynamic';

const ClientNotFound = dynamic(() => import('../components/ClientNotFound'), {
  ssr: false,
});

export default function NotFound() {
  return <ClientNotFound />;
}
