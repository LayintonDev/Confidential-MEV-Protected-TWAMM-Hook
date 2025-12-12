'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SimpleOrderForm } from '@/components/SimpleOrderForm';
import { OrderDashboard } from '@/components/OrderDashboard';
import { OrderDetails } from '@/components/OrderDetails';
import { CONTRACT_ADDRESSES } from '@/lib/constants';

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-950 to-slate-900">
      <PageHeader
        title="Confidential TWAMM Orders"
        description="Submit encrypted orders and monitor their execution in real-time"
      />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Order Form */}
          <div className="lg:col-span-1">
            <SimpleOrderForm
              poolAddress={CONTRACT_ADDRESSES.TWAMM_HOOK}
              onOrderSubmitted={(orderId) => setSelectedOrderId(orderId)}
            />
          </div>

          {/* Right Column - Dashboard */}
          <div className="lg:col-span-2">
            <OrderDashboard onOrderSelected={(orderId) => setSelectedOrderId(orderId)} />
          </div>
        </div>

        {/* Order Details - Full Width Below */}
        {selectedOrderId && (
          <div className="border-t border-slate-700 pt-8">
            <OrderDetails orderId={selectedOrderId} />
          </div>
        )}
      </div>
    </main>
  );
}
