"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, Package } from "lucide-react";
import {
  EmptyState,
  ListFooter,
  ListToolbar,
  RecordList,
  RecordRow,
} from "@/components/common/RecordList";
import ServiceIcon from "@/components/common/ServiceIcon";
import { splitAddress } from "@/lib/address";
import { BUCKET_DOT, BUCKET_TEXT, statusBucket, statusLabelKey } from "@/lib/deliveryStatus";
import { useT } from "@/lib/i18n";
import { formatStamp } from "@/lib/time";

interface Delivery {
  id: string;
  business_id: string;
  pickup_address: string;
  pickup_name: string;
  pickup_phone: string;
  dropoff_address: string;
  dropoff_name: string;
  dropoff_phone: string;
  package_description: string | null;
  service_type?: string | null;
  scheduled_pickup_at?: string | null;
  status: string;
  assigned_rider_id: string | null;
  created_at: string;
  delivered_at: string | null;
  delivery_fee?: number | null;
  businesses?: { id: string; name: string; phone: string };
  assigned_rider?: { id: string; name: string; phone: string } | null;
}

interface DeliveriesTableProps {
  deliveries: Delivery[];
  onAssignRider?: (deliveryId: string) => void;
  onConfirm?: (deliveryId: string) => void;
  onReject?: (deliveryId: string) => void;
  onDelete?: (deliveryId: string) => void;
  onEditFee?: (deliveryId: string, currentFee: number | null) => void;
  onExport?: (format: "csv" | "excel") => void;
  showBusiness?: boolean;
  showActions?: boolean;
  showFee?: boolean;
  basePath?: string;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Dispatch queues, as one card list.
 *
 * This was a nine-column table plus a duplicated `md:hidden` card list. The
 * dashboard caps content at 768px and `md:` switches at 768px, so the table
 * was always the one on screen - scrolling sideways on a desktop monitor -
 * and the card list was never seen. One rendering now, at every width.
 *
 * The chips are staff's queues, not the customer's three buckets: unassigned
 * work and work awaiting confirmation are different jobs for a dispatcher,
 * even though both are "active" to a customer.
 */
type Queue = "ALL" | "UNASSIGNED" | "AWAITING" | "ACTIVE" | "DONE" | "FAILED";

function queueOf(status: string): Exclude<Queue, "ALL"> {
  if (status === "CREATED") return "UNASSIGNED";
  if (status === "PENDING_CONFIRMATION") return "AWAITING";
  if (status === "DELIVERED") return "DONE";
  if (status === "FAILED" || status === "REJECTED") return "FAILED";
  return "ACTIVE";
}

export default function DeliveriesTable({
  deliveries,
  onAssignRider,
  onConfirm,
  onReject,
  onDelete,
  onEditFee,
  onExport,
  showBusiness = false,
  showActions = true,
  showFee = false,
  basePath = "/dashboard/business/deliveries",
  page = 1,
  pageSize = 25,
  totalCount,
  onPageChange,
}: DeliveriesTableProps) {
  const t = useT();
  const [queue, setQueue] = useState<Queue>("ALL");

  const hasPagination = totalCount !== undefined && onPageChange !== undefined;

  const counts = useMemo(() => {
    const c = { ALL: deliveries.length, UNASSIGNED: 0, AWAITING: 0, ACTIVE: 0, DONE: 0, FAILED: 0 };
    deliveries.forEach((d) => (c[queueOf(d.status)] += 1));
    return c;
  }, [deliveries]);

  const filtered = useMemo(
    () => (queue === "ALL" ? deliveries : deliveries.filter((d) => queueOf(d.status) === queue)),
    [deliveries, queue]
  );

  const chips = [
    { key: "ALL" as const, label: t("business.rides.status.all"), count: counts.ALL },
    {
      key: "UNASSIGNED" as const,
      label: t("components.deliveries.unassigned"),
      count: counts.UNASSIGNED,
    },
    {
      key: "AWAITING" as const,
      label: t("business.rides.status.pendingConfirmation"),
      count: counts.AWAITING,
    },
    { key: "ACTIVE" as const, label: t("business.rides.status.active"), count: counts.ACTIVE },
    { key: "DONE" as const, label: t("business.rides.status.delivered"), count: counts.DONE },
    { key: "FAILED" as const, label: t("business.rides.status.failed"), count: counts.FAILED },
  ];

  const formatCurrency = (amount: number | null | undefined) =>
    amount === null || amount === undefined ? "—" : `TZS ${amount.toLocaleString()}`;

  return (
    <div className="w-full min-w-0">
      <ListToolbar
        chips={chips}
        active={queue}
        onChange={setQueue}
        right={
          onExport && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onExport("csv")}
                title={t("components.deliveries.exportCsv")}
                aria-label={t("components.deliveries.exportCsv")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors active:bg-gray-100"
              >
                <Download className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => onExport("excel")}
                title={t("components.deliveries.exportExcel")}
                aria-label={t("components.deliveries.exportExcel")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors active:bg-gray-100"
              >
                <FileSpreadsheet className="h-[18px] w-[18px]" />
              </button>
            </div>
          )
        }
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title={t("components.deliveries.noneFound")} />
      ) : (
        <>
          <RecordList>
            {filtered.map((delivery) => {
              const tone = statusBucket(delivery.status);
              const destination = splitAddress(
                delivery.dropoff_name || delivery.dropoff_address || ""
              ).title;
              const rider =
                delivery.assigned_rider?.name || t("components.deliveries.notAssigned");

              return (
                <RecordRow
                  key={delivery.id}
                  href={showActions ? undefined : `${basePath}/${delivery.id}`}
                  leading={
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <ServiceIcon
                        serviceType={delivery.service_type}
                        className="h-[18px] w-[18px]"
                      />
                    </span>
                  }
                  title={destination || t("components.deliveries.dropoff")}
                  trailing={showFee ? formatCurrency(delivery.delivery_fee) : undefined}
                  subtitle={
                    showBusiness
                      ? delivery.businesses?.name || t("components.deliveries.unknown")
                      : splitAddress(delivery.pickup_address || "").title
                  }
                  meta={formatStamp(delivery.created_at)}
                  status={{
                    dot: BUCKET_DOT[tone],
                    text: BUCKET_TEXT[tone],
                    label: `${t(statusLabelKey(delivery.status))} · ${rider}`,
                  }}
                  actions={
                    showActions && (
                      <>
                        <Action href={`${basePath}/${delivery.id}`}>
                          {t("components.deliveries.view")}
                        </Action>
                        {onConfirm && delivery.status === "PENDING_CONFIRMATION" && (
                          <Action onClick={() => onConfirm(delivery.id)}>
                            {t("common.confirm")}
                          </Action>
                        )}
                        {onReject && delivery.status === "PENDING_CONFIRMATION" && (
                          <Action onClick={() => onReject(delivery.id)} tone="danger">
                            {t("components.deliveries.reject")}
                          </Action>
                        )}
                        {onAssignRider && !delivery.assigned_rider_id && (
                          <Action onClick={() => onAssignRider(delivery.id)}>
                            {t("components.deliveries.assignRider")}
                          </Action>
                        )}
                        {onEditFee && (
                          <Action
                            onClick={() => onEditFee(delivery.id, delivery.delivery_fee ?? null)}
                          >
                            {t("components.deliveries.editFee")}
                          </Action>
                        )}
                        {onDelete && (
                          <Action onClick={() => onDelete(delivery.id)} tone="danger">
                            {t("common.delete")}
                          </Action>
                        )}
                      </>
                    )
                  }
                />
              );
            })}
          </RecordList>

          {hasPagination && (
            <ListFooter
              shown={page * pageSize}
              total={totalCount}
              onLoadMore={() => onPageChange(page + 1)}
              labels={{
                showing: t("components.deliveries.showingOfTotal", {
                  shown: Math.min(page * pageSize, totalCount),
                  total: totalCount,
                }),
                loadMore: t("components.deliveries.nextPage"),
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

/** A small secondary action under a row. */
function Action({
  children,
  onClick,
  href,
  tone,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: "danger";
}) {
  const cls = `inline-flex min-h-[2.25rem] items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${
    tone === "danger"
      ? "border-red-200 text-red-600 active:bg-red-50"
      : "border-gray-200 text-gray-700 active:bg-gray-100"
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
