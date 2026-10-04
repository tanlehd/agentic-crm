import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Agentic CRM · Foundation', description: 'Conversational CRM development workspace' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}
