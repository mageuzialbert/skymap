"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  User,
  MapPin,
  Calendar,
  Filter,
  Eye,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from "lucide-react";

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
  status: string;
  assigned_rider_id: string | null;
  created_at: string;
  delivered_at: string | null;
  delivery_fee?: number | null;
  businesses?: {
    id: string;
    name: string;
    phone: string;
  };
  assigned_rider?: {
    id: string;
    name: string;
    phone: string;
  } | null;
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
  // Pagination props
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const statusColors: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-800 border border-gray-300",
  PENDING_CONFIRMATION:
    "bg-purple-100 text-purple-800 border border-purple-300",
  ASSIGNED: "bg-blue-100 text-blue-800 border border-blue-300",
  PICKED_UP: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  IN_TRANSIT: "bg-orange-100 text-orange-800 border border-orange-300",
  DELIVERED: "bg-green-100 text-green-800 border border-green-300",
  FAILED: "bg-red-100 text-red-800 border border-red-300",
  REJECTED: "bg-red-100 text-red-800 border border-red-300",
};

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
  onPageSizeChange,
}: DeliveriesTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Calculate pagination info
  const hasPagination = totalCount !== undefined && onPageChange !== undefined;
  const totalPages = hasPagination ? Math.ceil(totalCount / pageSize) : 1;
  const startItem = hasPagination ? (page - 1) * pageSize + 1 : 1;
  const endItem = hasPagination
    ? Math.min(page * pageSize, totalCount)
    : deliveries.length;

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (statusFilter === "ALL") return true;
    return delivery.status === statusFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return `TZS ${amount.toLocaleString()}`;
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Filter className="w-5 h-5 text-gray-500 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="ALL">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {onExport && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExport("csv")}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={() => onExport("excel")}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                title="Export to Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </button>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {hasPagination
            ? `Showing ${startItem}-${endItem} of ${totalCount} deliveries`
            : `Showing ${filteredDeliveries.length} of ${deliveries.length} deliveries`}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Pagination controls - Top */}
        {hasPagination && (
          <div className="px-3 sm:px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 sm:gap-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">
                Rows per page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(parseInt(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange?.(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPageChange?.(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {showBusiness && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pickup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drop-off
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {showFee && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                {showActions && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      5 +
                      (showBusiness ? 1 : 0) +
                      (showFee ? 1 : 0) +
                      (showActions ? 1 : 0)
                    }
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No deliveries found
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    {showBusiness && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {delivery.businesses?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {delivery.businesses?.phone || ""}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {delivery.pickup_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {delivery.pickup_address}
                      </div>
                      <div className="text-xs text-gray-400">
                        {delivery.pickup_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {delivery.dropoff_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {delivery.dropoff_address}
                      </div>
                      <div className="text-xs text-gray-400">
                        {delivery.dropoff_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[delivery.status] || statusColors.CREATED
                        }`}
                      >
                        {delivery.status.replace("_", " ")}
                      </span>
                    </td>
                    {showFee && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              delivery.delivery_fee
                                ? "text-gray-900 font-medium"
                                : "text-gray-400"
                            }
                          >
                            {formatCurrency(delivery.delivery_fee)}
                          </span>
                          {onEditFee && (
                            <button
                              onClick={() =>
                                onEditFee(
                                  delivery.id,
                                  delivery.delivery_fee ?? null,
                                )
                              }
                              className="text-gray-400 hover:text-primary p-1 rounded hover:bg-gray-100"
                              title="Edit fee"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {delivery.assigned_rider ? (
                        <div>
                          <div className="font-medium">
                            {delivery.assigned_rider.name}
                          </div>
                          <div className="text-xs">
                            {delivery.assigned_rider.phone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(delivery.created_at)}
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`${basePath}/${delivery.id}`}
                            className="text-gray-600 hover:text-primary flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="sr-only">View</span>
                          </Link>
                          {delivery.status === "PENDING_CONFIRMATION" &&
                            onConfirm && (
                              <button
                                onClick={() => onConfirm(delivery.id)}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                Confirm
                              </button>
                            )}
                          {delivery.status === "PENDING_CONFIRMATION" &&
                            onReject && (
                              <button
                                onClick={() => onReject(delivery.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Reject
                              </button>
                            )}
                          {!delivery.assigned_rider_id &&
                            delivery.status === "CREATED" &&
                            onAssignRider && (
                              <button
                                onClick={() => onAssignRider(delivery.id)}
                                className="text-primary hover:text-primary-dark"
                              >
                                Assign Rider
                              </button>
                            )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(delivery.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete delivery"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
