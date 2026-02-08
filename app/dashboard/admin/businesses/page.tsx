"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, X, Loader2, Plus } from "lucide-react";
import { usePermissions } from "@/lib/permissions-context";
import BusinessesTable from "@/components/businesses/BusinessesTable";
import BusinessForm, {
  BusinessFormData,
} from "@/components/businesses/BusinessForm";
import BusinessDetailsModal from "@/components/businesses/BusinessDetailsModal";

interface Business {
  id: string;
  name: string;
  phone: string;
  delivery_fee: number | null;
  active: boolean;
  created_at: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  district_id?: number | null;
  user?: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
}

export default function AdminBusinessesPage() {
  const router = useRouter();
  const {
    role,
    hasPermission,
    hasModuleAccess,
    loading: permissionsLoading,
  } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [viewingBusiness, setViewingBusiness] = useState<Business | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Permission checks
  const canAccess = role === "ADMIN" || hasModuleAccess("businesses");
  const canCreate = role === "ADMIN" || hasPermission("businesses.create");
  const canEdit = role === "ADMIN" || hasPermission("businesses.update");

  useEffect(() => {
    if (permissionsLoading) return;

    if (!canAccess) {
      router.push("/dashboard/business");
      return;
    }

    loadBusinesses();
  }, [canAccess, permissionsLoading, router]);

  // Debounced search effect
  useEffect(() => {
    if (permissionsLoading || !canAccess) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      loadBusinesses();
    }, 500);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, statusFilter]);

  async function loadBusinesses() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "1000");

      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      if (statusFilter !== "ALL") {
        params.set("active", statusFilter === "ACTIVE" ? "true" : "false");
      }

      const url = `/api/admin/businesses?${params.toString()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      } else {
        console.error("Failed to load businesses:", response.status);
      }
    } catch (error) {
      console.error("Error loading businesses:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: BusinessFormData) {
    setSubmitting(true);
    setError("");

    try {
      if (editingBusiness) {
        // Update existing business
        const updateData: any = {
          name: data.name,
          phone: data.phone,
          active: data.active,
          address: data.address || null,
          latitude: data.latitude,
          longitude: data.longitude,
          district_id: data.district_id,
        };

        if (data.delivery_fee.trim()) {
          const fee = parseFloat(data.delivery_fee);
          if (isNaN(fee) || fee < 0) {
            throw new Error("Delivery fee must be a positive number");
          }
          updateData.delivery_fee = fee;
        } else {
          updateData.delivery_fee = null;
        }

        const response = await fetch(
          `/api/admin/businesses/${editingBusiness.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update business");
        }
      } else {
        // Create new business
        const createData: any = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          address: data.address || null,
          latitude: data.latitude,
          longitude: data.longitude,
          district_id: data.district_id,
        };

        if (data.delivery_fee.trim()) {
          const fee = parseFloat(data.delivery_fee);
          if (isNaN(fee) || fee < 0) {
            throw new Error("Delivery fee must be a positive number");
          }
          createData.delivery_fee = fee;
        }

        const response = await fetch("/api/admin/businesses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create business");
        }
      }

      setShowForm(false);
      setEditingBusiness(null);
      loadBusinesses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save business");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(business: Business) {
    const action = business.active ? "disable" : "enable";
    if (!confirm(`Are you sure you want to ${action} this client?`)) return;

    try {
      const response = await fetch(`/api/admin/businesses/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !business.active }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} client`);
      }

      loadBusinesses();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} client`);
    }
  }

  function handleView(business: Business) {
    setViewingBusiness(business);
  }

  function handleEdit(business: Business) {
    setEditingBusiness(business);
    setShowForm(true);
    setError("");
  }

  function handleCreate() {
    setEditingBusiness(null);
    setShowForm(true);
    setError("");
  }

  function handleCancel() {
    setShowForm(false);
    setEditingBusiness(null);
    setError("");
  }

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
  }

  if (loading && businesses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
        {!showForm && canCreate && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Register Client
          </button>
        )}
      </div>

      {/* Filters Section */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || statusFilter !== "ALL") && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {businesses.length} client
            {businesses.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingBusiness ? "Edit Business" : "Register New Business"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <BusinessForm
            business={editingBusiness}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
            error={error}
          />
        </div>
      )}

      {/* Clients Table */}
      {!showForm && (
        <BusinessesTable
          businesses={businesses}
          onView={handleView}
          onEdit={canEdit ? handleEdit : undefined}
          onToggleActive={canEdit ? handleToggleActive : undefined}
          showActions={canEdit}
        />
      )}

      {/* Client Details Modal */}
      <BusinessDetailsModal
        isOpen={viewingBusiness !== null}
        onClose={() => setViewingBusiness(null)}
        business={viewingBusiness}
      />
    </div>
  );
}
