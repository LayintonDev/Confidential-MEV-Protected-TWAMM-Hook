/**
 * Header component for pages
 */

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  showConnectButton?: boolean;
}

export function PageHeader({
  title,
  description,
  showConnectButton = true,
}: PageHeaderProps) {
  return (
    <header className="border-b border-slate-700 sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {description && <p className="text-sm text-slate-400">{description}</p>}
          </div>
        </div>
        {showConnectButton && <ConnectButton />}
      </div>
    </header>
  );
}
