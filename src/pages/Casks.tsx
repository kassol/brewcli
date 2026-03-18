import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme.ts";
import { useAsync } from "../hooks/useAsync.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";
import { Table, type Column, type SortDirection } from "../components/Table.tsx";
import { Loading, ErrorDisplay } from "../components/Loading.tsx";
import { SIDEBAR_WIDTH, STATUS_BAR_HEIGHT } from "../theme.ts";
import * as brew from "../brew/index.ts";
import type { CaskInfo } from "../brew/types.ts";

type SortKey = "name" | "version" | "status";

export type CaskAction =
  | { type: "uninstall_cask"; name: string }
  | { type: "upgrade_cask"; name: string }
  | { type: "upgrade_all_casks" };

interface CasksProps {
  isFocused: boolean;
  onViewDetail: (name: string) => void;
  onAction: (action: CaskAction) => void;
}

export function Casks({ isFocused, onViewDetail, onAction }: CasksProps) {
  const { data, loading, refreshing, error, refresh } = useAsync(
    "casks:installed",
    () => brew.cask.listInstalled(),
  );
  const { height, width } = useTerminalSize();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const sortedData = useMemo(() => {
    if (!data) return [];
    let items = [...data];

    if (filter) {
      const f = filter.toLowerCase();
      items = items.filter(
        (c) =>
          c.token.toLowerCase().includes(f) ||
          c.desc?.toLowerCase().includes(f) ||
          c.name.some((n) => n.toLowerCase().includes(f)),
      );
    }

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.token.localeCompare(b.token);
          break;
        case "version":
          cmp = (a.version ?? "").localeCompare(b.version ?? "");
          break;
        case "status":
          cmp = Number(a.outdated) - Number(b.outdated);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [data, filter, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key as SortKey);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  useInput(
    (input, key) => {
      if (filterMode) {
        if (key.escape) {
          setFilterMode(false);
          setFilter("");
        } else if (key.return) {
          setFilterMode(false);
        } else if (key.backspace || key.delete) {
          setFilter((f) => f.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setFilter((f) => f + input);
        }
        return;
      }

      if (input === "/" || input === "f") {
        setFilterMode(true);
        return;
      }
      if (input === "r") {
        refresh();
        return;
      }
      const row = sortedData[selectedIndex];
      if (!row) return;

      if (key.return) {
        onViewDetail(row.token);
        return;
      }
      if (input === "d") {
        onAction({ type: "uninstall_cask", name: row.token });
        return;
      }
      if (input === "u") {
        onAction({ type: "upgrade_cask", name: row.token });
        return;
      }
      if (input === "U") {
        onAction({ type: "upgrade_all_casks" });
        return;
      }
      if (input === "1") handleSort("name");
      if (input === "2") handleSort("version");
      if (input === "3") handleSort("status");
    },
    { isActive: isFocused },
  );

  if (loading && !data) return <Loading message="Loading casks..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refresh} />;

  const columns: Column<CaskInfo>[] = [
    {
      key: "token",
      header: "Name",
      width: "flex",
      render: (row) => row.token,
    },
    {
      key: "name",
      header: "Display Name",
      width: 25,
      render: (row) => row.name[0] ?? row.token,
    },
    {
      key: "version",
      header: "Version",
      width: 16,
      render: (row) => row.version ?? "-",
    },
    {
      key: "status",
      header: "Status",
      width: 14,
      render: (row) => {
        if (row.outdated) return "outdated";
        if (row.auto_updates) return "auto-update";
        return "ok";
      },
      color: (row) => {
        if (row.outdated) return colors.warning;
        if (row.auto_updates) return colors.accent;
        return colors.success;
      },
    },
  ];

  const tableHeight = height - 4 - STATUS_BAR_HEIGHT;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1} justifyContent="space-between">
        <Box gap={1}>
          <Text bold color={colors.accent}>
            Casks
          </Text>
          <Text color={colors.muted}>({sortedData.length})</Text>
          {refreshing && <Text color={colors.warning}>Refreshing</Text>}
        </Box>
        <Box gap={1}>
          {filterMode ? (
            <Box>
              <Text color={colors.primary}>Filter: </Text>
              <Text color={colors.text}>{filter}</Text>
              <Text color={colors.primary}>_</Text>
            </Box>
          ) : filter ? (
            <Text color={colors.muted}>filter: {filter}</Text>
          ) : null}
          <Text color={colors.muted}>
            [f] Filter  [r] Refresh  [1-3] Sort
          </Text>
        </Box>
      </Box>

      <Table<CaskInfo>
        columns={columns}
        data={sortedData}
        selectedIndex={selectedIndex}
        onChangeIndex={setSelectedIndex}
        onSelect={(row) => onViewDetail(row.token)}
        isFocused={isFocused && !filterMode}
        height={tableHeight}
        sortColumn={sortKey}
        sortDirection={sortDir}
        onSort={handleSort}
        width={Math.max(56, width - SIDEBAR_WIDTH - 4)}
        emptyMessage={
          filter ? "No casks match filter" : "No casks installed"
        }
      />
    </Box>
  );
}
