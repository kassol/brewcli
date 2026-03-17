import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme.ts";
import { useAsync } from "../hooks/useAsync.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";
import { Table, type Column } from "../components/Table.tsx";
import { Loading, ErrorDisplay } from "../components/Loading.tsx";
import { STATUS_BAR_HEIGHT } from "../theme.ts";
import * as brew from "../brew/index.ts";
import type { ServiceInfo } from "../brew/types.ts";

export type ServiceAction =
  | { type: "start_service"; name: string }
  | { type: "stop_service"; name: string }
  | { type: "restart_service"; name: string };

interface ServicesProps {
  isFocused: boolean;
  onAction: (action: ServiceAction) => void;
}

export function Services({ isFocused, onAction }: ServicesProps) {
  const { data, loading, refreshing, error, refresh } = useAsync(
    "services",
    () => brew.service.list(),
  );
  const { height } = useTerminalSize();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput(
    (input, key) => {
      if (input === "r") {
        refresh();
        return;
      }
      const row = data?.[selectedIndex];
      if (!row) return;

      if (input === "s") {
        if (row.status === "started") {
          onAction({ type: "stop_service", name: row.name });
        } else {
          onAction({ type: "start_service", name: row.name });
        }
        return;
      }
      if (input === "R") {
        onAction({ type: "restart_service", name: row.name });
        return;
      }
    },
    { isActive: isFocused },
  );

  if (loading && !data) return <Loading message="Loading services..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refresh} />;

  const columns: Column<ServiceInfo>[] = [
    {
      key: "name",
      header: "Service",
      width: "flex",
      render: (row) => row.name,
    },
    {
      key: "status",
      header: "Status",
      width: 14,
      render: (row) => row.status ?? "none",
      color: (row) => {
        if (row.status === "started") return colors.success;
        if (row.status === "error") return colors.error;
        return colors.muted;
      },
    },
    {
      key: "user",
      header: "User",
      width: 16,
      render: (row) => row.user ?? "-",
    },
    {
      key: "exit_code",
      header: "Exit",
      width: 8,
      render: (row) => (row.exit_code != null ? String(row.exit_code) : "-"),
      color: (row) =>
        row.exit_code != null && row.exit_code !== 0
          ? colors.error
          : undefined,
    },
  ];

  const tableHeight = height - 4 - STATUS_BAR_HEIGHT;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1} justifyContent="space-between">
        <Box gap={1}>
          <Text bold color={colors.teal}>
            Services
          </Text>
          <Text color={colors.muted}>({data?.length ?? 0})</Text>
          {refreshing && <Text color={colors.warning}>refreshing...</Text>}
        </Box>
        <Text color={colors.muted}>
          [s] Start/Stop  [R] Restart  [r] Refresh
        </Text>
      </Box>

      <Table<ServiceInfo>
        columns={columns}
        data={data ?? []}
        selectedIndex={selectedIndex}
        onChangeIndex={setSelectedIndex}
        isFocused={isFocused}
        height={tableHeight}
        emptyMessage="No services found. Install a formula with a service (e.g. postgresql, redis)"
      />
    </Box>
  );
}
