import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { SIDEBAR_WIDTH, STATUS_BAR_HEIGHT } from "../theme.ts";
import { useTheme } from "../hooks/useTheme.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";
import { Table, type Column } from "../components/Table.tsx";
import { Loading, ErrorDisplay } from "../components/Loading.tsx";
import * as brew from "../brew/index.ts";

type OutdatedRow = {
  name: string;
  type: "formula" | "cask";
  currentVersion: string;
  newVersion: string;
  pinned: boolean;
};

export type OutdatedAction =
  | { type: "upgrade"; name: string; pkgType: "formula" | "cask" }
  | { type: "upgrade_all" }
  | { type: "uninstall"; name: string; pkgType: "formula" | "cask" };

interface OutdatedProps {
  isFocused: boolean;
  onViewDetail: (name: string, type: "formula" | "cask") => void;
  onAction: (action: OutdatedAction) => void;
}

export function Outdated({ isFocused, onViewDetail, onAction }: OutdatedProps) {
  const { colors } = useTheme();
  const { data, loading, refreshing, error, refresh } = useAsync("outdated", async () => {
    await brew.formula.update().catch(() => {});
    const outdated = await brew.formula.outdated();
    const rows: OutdatedRow[] = [];

    for (const f of outdated.formulae) {
      rows.push({
        name: f.name,
        type: "formula",
        currentVersion: f.installed_versions.join(", "),
        newVersion: f.current_version,
        pinned: f.pinned,
      });
    }
    for (const c of outdated.casks) {
      rows.push({
        name: c.name,
        type: "cask",
        currentVersion: c.installed_versions,
        newVersion: c.current_version,
        pinned: false,
      });
    }
    return rows;
  }, { ttl: 300_000, autoRefresh: false });

  const { height, width } = useTerminalSize();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput(
    (input, key) => {
      if (input === "r") {
        refresh();
        return;
      }
      const row = data?.[selectedIndex];
      if (!row) return;

      if (key.return) {
        onViewDetail(row.name, row.type);
        return;
      }
      if (input === "u") {
        onAction({ type: "upgrade", name: row.name, pkgType: row.type });
        return;
      }
      if (input === "U") {
        onAction({ type: "upgrade_all" });
        return;
      }
      if (input === "d") {
        onAction({ type: "uninstall", name: row.name, pkgType: row.type });
        return;
      }
    },
    { isActive: isFocused },
  );

  if (loading && !data) return <Loading message="Updating index and checking for updates..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refresh} />;

  const columns: Column<OutdatedRow>[] = [
    {
      key: "name",
      header: "Package",
      width: "flex",
      render: (row) => row.name,
    },
    {
      key: "type",
      header: "Type",
      width: 10,
      render: (row) => row.type,
      color: (row) =>
        row.type === "formula" ? colors.primary : colors.accent,
    },
    {
      key: "currentVersion",
      header: "Installed",
      width: 16,
      render: (row) => row.currentVersion,
      color: () => colors.muted,
    },
    {
      key: "arrow",
      header: "",
      width: 4,
      render: () => "->",
      color: () => colors.warning,
    },
    {
      key: "newVersion",
      header: "Available",
      width: 16,
      render: (row) => row.newVersion,
      color: () => colors.success,
    },
    {
      key: "pinned",
      header: "",
      width: 6,
      render: (row) => (row.pinned ? "[pin]" : ""),
      color: () => colors.pink,
    },
  ];

  const tableHeight = height - 5 - STATUS_BAR_HEIGHT;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1} justifyContent="space-between">
        <Box gap={1}>
          <Text bold color={colors.warning}>
            Outdated Packages
          </Text>
          <Text color={colors.muted}>({data?.length ?? 0})</Text>
          {refreshing && <Text color={colors.warning}>Refreshing</Text>}
        </Box>
        <Text color={colors.muted}>
          [Enter] Open  [u] Upgrade  [U] Upgrade All  [r] Refresh
        </Text>
      </Box>

      {data && data.length === 0 ? (
        <Box
          justifyContent="center"
          alignItems="center"
          flexGrow={1}
          flexDirection="column"
          gap={1}
        >
          <Text color={colors.success} bold>
            Everything is up to date
          </Text>
          <Text color={colors.muted}>
            All packages are at their latest versions.
          </Text>
        </Box>
      ) : (
        <Table<OutdatedRow>
          columns={columns}
          data={data ?? []}
          selectedIndex={selectedIndex}
          onChangeIndex={setSelectedIndex}
          onSelect={(row) => onViewDetail(row.name, row.type)}
          isFocused={isFocused}
          height={tableHeight}
          width={Math.max(56, width - SIDEBAR_WIDTH - 4)}
        />
      )}
    </Box>
  );
}
