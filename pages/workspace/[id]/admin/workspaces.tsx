"use client"

import React, { useEffect, useState } from "react"
import type { pageWithLayout } from "@/layoutTypes"
import Workspace from "@/layouts/workspace"
import axios from "axios"
import {
  IconTrash,
  IconBan,
  IconCheck,
  IconAlertTriangle,
  IconReload,
  IconClock,
  IconCircleFilled,
} from "@tabler/icons-react"
import clsx from "clsx"

interface WorkspaceData {
  groupId: number
  groupName: string
  groupLogo?: string
  isDeleted: boolean
  isSuspended: boolean
  deletedAt?: string
  suspendedAt?: string
  lastSynced?: string
  members?: Array<{
    userId: number
    user: {
      userid: bigint
      username: string
      isOwner: boolean
    }
  }>
}

interface ActionResponse {
  success: boolean
  message?: string
  error?: string
  workspace?: Partial<WorkspaceData>
}

const WorkspaceManagement: pageWithLayout = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDeleted, setFilterDeleted] = useState(false)
  const [filterSuspended, setFilterSuspended] = useState(false)

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const fetchWorkspaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get<{ success: boolean; workspaces: WorkspaceData[] }>(
        "/api/admin/workspaces"
      )
      if (response.data.success) {
        setWorkspaces(response.data.workspaces)
      }
    } catch (err) {
      setError("Failed to load workspaces")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (
    groupId: number,
    action: "suspend" | "unsuspend" | "delete" | "undelete"
  ) => {
    const workspace = workspaces.find((w) => w.groupId === groupId)
    const actionText =
      action === "suspend"
        ? "suspend"
        : action === "unsuspend"
          ? "unsuspend"
          : action === "delete"
            ? "delete"
            : "restore"

    if (!window.confirm(`Are you sure you want to ${actionText} "${workspace?.groupName}"?`)) {
      return
    }

    try {
      setActionInProgress(groupId)
      const response = await axios.post<ActionResponse>(
        `/api/admin/workspaces/${groupId}`,
        { action }
      )

      if (response.data.success) {
        setSuccessMessage(response.data.message || `Successfully ${actionText}ed workspace`)
        setTimeout(() => setSuccessMessage(null), 5000)

        // Update local state
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.groupId === groupId
              ? {
                  ...ws,
                  ...response.data.workspace,
                }
              : ws
          )
        )
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "An error occurred"
      setError(errorMsg)
      setTimeout(() => setError(null), 5000)
    } finally {
      setActionInProgress(null)
    }
  }

  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch =
      (ws.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      ws.groupId.toString().includes(searchQuery)
    const matchesDeleted = filterDeleted ? ws.isDeleted : true
    const matchesSuspended = filterSuspended ? ws.isSuspended : true

    return matchesSearch && matchesDeleted && matchesSuspended
  })

  const formatDate = (date?: string) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <IconBan className="w-10 h-10 text-red-500" />
            Workspace Management
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Manage all workspaces in your Orbit deployment - delete or suspend as needed
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <IconAlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-200">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <IconCheck className="w-5 h-5 text-green-500" />
            <span className="text-green-700 dark:text-green-200">{successMessage}</span>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search workspaces by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-64 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchWorkspaces}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              <IconReload className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterDeleted}
                onChange={(e) => setFilterDeleted(e.target.checked)}
                className="w-4 h-4 text-red-500 rounded"
              />
              <span className="text-slate-700 dark:text-slate-300">Show only deleted</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterSuspended}
                onChange={(e) => setFilterSuspended(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded"
              />
              <span className="text-slate-700 dark:text-slate-300">Show only suspended</span>
            </label>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin">
              <IconReload className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        )}

        {/* Workspaces Table */}
        {!loading && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {filteredWorkspaces.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400">
                  {workspaces.length === 0 ? "No workspaces found" : "No workspaces match your filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Workspace
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Last Synced
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkspaces.map((workspace) => (
                      <tr
                        key={workspace.groupId}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {workspace.groupLogo && (
                              <img
                                src={workspace.groupLogo}
                                alt={workspace.groupName}
                                className="w-10 h-10 rounded-full"
                              />
                            )}
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {workspace.groupName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {workspace.groupId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {workspace.isDeleted && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <IconCircleFilled className="w-3 h-3" />
                                <span className="text-sm font-medium">Deleted</span>
                              </div>
                            )}
                            {workspace.isSuspended && (
                              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                <IconCircleFilled className="w-3 h-3" />
                                <span className="text-sm font-medium">Suspended</span>
                              </div>
                            )}
                            {!workspace.isDeleted && !workspace.isSuspended && (
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <IconCircleFilled className="w-3 h-3" />
                                <span className="text-sm font-medium">Active</span>
                              </div>
                            )}
                            {workspace.deletedAt && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <IconClock className="w-3 h-3" />
                                Deleted: {formatDate(workspace.deletedAt)}
                              </div>
                            )}
                            {workspace.suspendedAt && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <IconClock className="w-3 h-3" />
                                Suspended: {formatDate(workspace.suspendedAt)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(workspace.lastSynced)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {!workspace.isDeleted && (
                              <>
                                {!workspace.isSuspended ? (
                                  <button
                                    onClick={() => handleAction(workspace.groupId, "suspend")}
                                    disabled={actionInProgress === workspace.groupId}
                                    className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded flex items-center gap-1 disabled:opacity-50 transition-colors"
                                  >
                                    <IconBan className="w-4 h-4" />
                                    Suspend
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAction(workspace.groupId, "unsuspend")}
                                    disabled={actionInProgress === workspace.groupId}
                                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded flex items-center gap-1 disabled:opacity-50 transition-colors"
                                  >
                                    <IconCheck className="w-4 h-4" />
                                    Unsuspend
                                  </button>
                                )}
                              </>
                            )}

                            {!workspace.isDeleted ? (
                              <button
                                onClick={() => handleAction(workspace.groupId, "delete")}
                                disabled={actionInProgress === workspace.groupId}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded flex items-center gap-1 disabled:opacity-50 transition-colors"
                              >
                                <IconTrash className="w-4 h-4" />
                                Delete
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(workspace.groupId, "undelete")}
                                disabled={actionInProgress === workspace.groupId}
                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded flex items-center gap-1 disabled:opacity-50 transition-colors"
                              >
                                <IconCheck className="w-4 h-4" />
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer with count */}
            {!loading && (
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredWorkspaces.length} of {workspaces.length} workspace
                {workspaces.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

WorkspaceManagement.getLayout = (page: React.ReactElement) => (
  <Workspace>{page}</Workspace>
)

export default WorkspaceManagement
