'use client';

import { Package, UserRound, Clock, ShoppingBag, Motorbike } from 'lucide-react';
import Lorry from '@/components/common/LorryIcon';
import Bajaj from '@/components/common/BajajIcon';
import { getServiceType } from '@/lib/serviceTypes';

/** Every icon a service type can name, including the two local ones Lucide
 *  has no equivalent for. */
export const SERVICE_ICONS: Record<string, any> = {
  Package,
  UserRound,
  Clock,
  ShoppingBag,
  Motorbike,
  Bajaj,
  Lorry,
};

/** The icon for a delivery's service type (delivery / ride / hire / errand). */
export default function ServiceIcon({
  serviceType,
  className = 'h-5 w-5',
}: {
  serviceType: string | null | undefined;
  className?: string;
}) {
  const Icon = SERVICE_ICONS[getServiceType(serviceType).icon] || Package;
  return <Icon className={className} />;
}
