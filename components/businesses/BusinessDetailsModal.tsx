"use client";

import { Building2, Calendar, DollarSign, Phone, Shield } from "lucide-react";
import Sheet from "@/components/common/Sheet";
import FieldGroup from "@/components/wizard/FieldGroup";
import { useT } from "@/lib/i18n";
import { formatStamp } from "@/lib/time";
import { activeDot, activeLabelKey, activeText, roleLabel } from "@/lib/userStatus";

interface Business {
  id: string;
  name: string;
  phone: string;
  delivery_fee: number | null;
  active: boolean;
  created_at: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
}

/** One client, read-only. */
export default function BusinessDetailsModal({
  isOpen,
  onClose,
  business,
}: {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
}) {
  const t = useT();
  if (!business) return null;

  const fee =
    business.delivery_fee === null
      ? t("common.notSet")
      : new Intl.NumberFormat("en-TZ", {
          style: "currency",
          currency: "TZS",
          minimumFractionDigits: 0,
        }).format(business.delivery_fee);

  return (
    <Sheet open={isOpen} onClose={onClose} title={t("admin.clients.detailsTitle")}>
      <div className="space-y-5 p-4">
        <FieldGroup label={t("admin.clients.clientInfo")}>
          <Detail icon={Building2} label={t("admin.clients.name")} value={business.name} />
          <Detail icon={Phone} label={t("admin.clients.phone")} value={business.phone} />
          <Detail icon={DollarSign} label={t("admin.clients.deliveryFee")} value={fee} />
          <div>
            <p className="text-[13px] text-gray-500">{t("admin.clients.status")}</p>
            <p
              className={`mt-0.5 inline-flex items-center gap-1.5 text-[15px] font-medium ${activeText(
                business.active
              )}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeDot(business.active)}`} />
              {t(activeLabelKey(business.active))}
            </p>
          </div>
          <Detail
            icon={Calendar}
            label={t("admin.clients.created")}
            value={formatStamp(business.created_at)}
          />
        </FieldGroup>

        {business.user && (
          <FieldGroup label={t("admin.clients.userAccount")}>
            <Detail icon={Shield} label={t("admin.clients.name")} value={business.user.name} />
            <Detail icon={Phone} label={t("admin.clients.phone")} value={business.user.phone} />
            <Detail
              icon={Shield}
              label={t("admin.clients.role")}
              value={roleLabel(business.user.role, t)}
            />
          </FieldGroup>
        )}
      </div>
    </Sheet>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] text-gray-500">{label}</p>
      <p className="mt-0.5 flex items-center gap-2 text-[15px] font-medium text-gray-900">
        <Icon className="h-4 w-4 shrink-0 text-gray-400" />
        {value}
      </p>
    </div>
  );
}
