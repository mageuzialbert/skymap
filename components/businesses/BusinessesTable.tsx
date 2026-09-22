"use client";

import { Building2 } from "lucide-react";
import { EmptyState, RecordList, RecordRow } from "@/components/common/RecordList";
import { useT } from "@/lib/i18n";
import { activeDot, activeLabelKey, activeText } from "@/lib/userStatus";

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

interface BusinessesTableProps {
  businesses: Business[];
  onView?: (business: Business) => void;
  onEdit?: (business: Business) => void;
  onToggleActive?: (business: Business) => void;
  showActions?: boolean;
}

/**
 * The client list.
 *
 * Was a seven-column table with no mobile fallback at all, and the only file
 * group in the app with no translations - a Swahili admin got a bilingual
 * screen. Now a card list, fully translated.
 */
export default function BusinessesTable({
  businesses,
  onView,
  onEdit,
  onToggleActive,
  showActions = true,
}: BusinessesTableProps) {
  const t = useT();

  const formatCurrency = (amount: number | null): string =>
    amount === null
      ? t("common.notSet")
      : new Intl.NumberFormat("en-TZ", {
          style: "currency",
          currency: "TZS",
          minimumFractionDigits: 0,
        }).format(amount);

  if (businesses.length === 0) {
    return <EmptyState icon={Building2} title={t("admin.businesses.noneFound")} />;
  }

  return (
    <RecordList>
      {businesses.map((business) => (
        <RecordRow
          key={business.id}
          onClick={onView ? () => onView(business) : undefined}
          leading={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Building2 className="h-[18px] w-[18px]" />
            </span>
          }
          title={business.name}
          trailing={formatCurrency(business.delivery_fee)}
          subtitle={business.phone}
          status={{
            dot: activeDot(business.active),
            text: activeText(business.active),
            label: t(activeLabelKey(business.active)),
          }}
          actions={
            showActions && (
              <>
                {onView && (
                  <Action onClick={() => onView(business)}>
                    {t("admin.clients.viewDetails")}
                  </Action>
                )}
                {onEdit && (
                  <Action onClick={() => onEdit(business)}>{t("admin.clients.editClient")}</Action>
                )}
                {onToggleActive && (
                  <Action onClick={() => onToggleActive(business)} tone={business.active ? "danger" : undefined}>
                    {business.active
                      ? t("admin.clients.disableClient")
                      : t("admin.clients.enableClient")}
                  </Action>
                )}
              </>
            )
          }
        />
      ))}
    </RecordList>
  );
}

function Action({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[2.25rem] items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${
        tone === "danger"
          ? "border-red-200 text-red-600 active:bg-red-50"
          : "border-gray-200 text-gray-700 active:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
