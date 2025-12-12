'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useOrderEvents } from '@/hooks/useConfidentialTWAMM';
import { useUserOrders } from '@/hooks/useOrderStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Clock, CheckCircle, ChevronRight } from 'lucide-react';

interface OrderDashboardProps {
  onOrderSelected?: (orderId: string) => void;
}

export function OrderDashboard({ onOrderSelected }: OrderDashboardProps) {
  const { address } = useAccount();
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  // Fetch user orders
  const { orders: fetchedOrders, isLoading } = useUserOrders(address);

  // Listen for new order events
  useOrderEvents((log) => {
    console.log('New order event:', log);
    // Dashboard will re-fetch on event
  });

  // Filter orders based on status
  const filteredOrders = fetchedOrders.filter((order) => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  const activeCount = fetchedOrders.filter((o) => o.status === 'active').length;
  const completedCount = fetchedOrders.filter((o) => o.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-400">Active Orders</div>
            <div className="mt-2 text-3xl font-bold text-blue-400">{activeCount}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-400">Completed</div>
            <div className="mt-2 text-3xl font-bold text-green-400">{completedCount}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-400">Total Orders</div>
            <div className="mt-2 text-3xl font-bold text-purple-400">{fetchedOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-20 rounded bg-slate-800"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : fetchedOrders.length === 0 ? (
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <AlertCircle className="h-5 w-5" />
              No {filterStatus !== 'all' ? `${filterStatus} ` : ''}orders found
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.orderId.toString()}
              className="cursor-pointer border-slate-700 bg-slate-900 transition-all hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/20"
              onClick={() => onOrderSelected?.(order.orderId.toString())}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  {/* Left section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {/* Direction Icon */}
                      <div className="rounded-lg p-2 bg-green-500/10 text-green-400">
                        <TrendingUp className="h-5 w-5" />
                      </div>

                      {/* Order Info */}
                      <div>
                        <div className="font-semibold text-white">
                          Order #{order.orderId.toString()}
                        </div>
                        <div className="text-sm text-slate-400">
                          {order.remainingBalance} remaining
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right section */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="h-4 w-4" />
                        {order.totalSlices} slices
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.executedSlices} executed
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      variant={
                        order.status === 'active'
                          ? 'default'
                          : order.status === 'completed'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {order.status === 'active' ? (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
                          Active
                        </div>
                      ) : order.status === 'completed' ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </div>
                      ) : (
                        'Cancelled'
                      )}
                    </Badge>

                    {/* Chevron */}
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  </div>
                </div>

                {/* Progress bar for active orders */}
                {order.status === 'active' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Progress</span>
                      <span>{Math.round((order.executedSlices / order.totalSlices) * 100)}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-blue-600 to-purple-600 transition-all"
                        style={{
                          width: `${(order.executedSlices / order.totalSlices) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
