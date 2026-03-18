import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { SIDEBAR_WIDTH, STATUS_BAR_HEIGHT } from "../theme.ts";
import { useTheme } from "../hooks/useTheme.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";
import { Table, type Column, type SortDirection } from "../components/Table.tsx";
import { Loading, ErrorDisplay } from "../components/Loading.tsx";
import * as brew from "../brew/index.ts";
import type { FormulaInfo } from "../brew/types.ts";

type SortKey = "name" | "version" | "deps" | "status";
type ViewMode = "all" | "intentional" | "dependency";

const viewModeLabels: Record<ViewMode, string> = {
  all: "All",
  intentional: "Intentional",
  dependency: "Dependencies",
};

interface FormulaeProps {
  isFocused: boolean;
  onViewDetail: (name: string) => void;
  onAction: (action: FormulaeAction) => void;
}

export type FormulaeAction =
  | { type: "uninstall"; name: string }
  | { type: "upgrade"; name: string }
  | { type: "upgrade_all" }
  | { type: "pin"; name: string }
  | { type: "unpin"; name: string };

function isInstalledOnRequest(f: FormulaInfo): boolean {
  return f.installed.length > 0 && (f.installed[0]?.installed_on_request ?? false);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "~" : s;
}

export function Formulae({ isFocused, onViewDetail, onAction }: FormulaeProps) {
  const { colors } = useTheme();
  const { data, loading, refreshing, error, refresh } = useAsync(
    "formulae:installed",
    () => brew.formula.listInstalled(),
  );
  const { height, width } = useTerminalSize();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const sortedData = useMemo(() => {
    if (!data) return [];
    let items = [...data];

    // View mode filter
    if (viewMode === "intentional") {
      items = items.filter(isInstalledOnRequest);
    } else if (viewMode === "dependency") {
      items = items.filter((f) => !isInstalledOnRequest(f));
    }

    // Text filter
    if (filter) {
      const f = filter.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(f) ||
          p.desc?.toLowerCase().includes(f),
      );
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "version":
          cmp = (a.versions.stable ?? "").localeCompare(b.versions.stable ?? "");
          break;
        case "deps":
          cmp = a.dependencies.length - b.dependencies.length;
          break;
        case "status":
          cmp = Number(a.outdated) - Number(b.outdated);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [data, filter, sortKey, sortDir, viewMode]);

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

      if (input === "/") {
        setFilterMode(true);
        return;
      }
      if (input === "r") {
        refresh();
        return;
      }
      if (input === "v") {
        setViewMode((m) => {
          const modes: ViewMode[] = ["all", "intentional", "dependency"];
          return modes[(modes.indexOf(m) + 1) % modes.length]!;
        });
        setSelectedIndex(0);
        return;
      }
      const row = sortedData[selectedIndex];
      if (!row) return;

      if (key.return) {
        onViewDetail(row.name);
        return;
      }
      if (input === "d") {
        onAction({ type: "uninstall", name: row.name });
        return;
      }
      if (input === "u") {
        onAction({ type: "upgrade", name: row.name });
        return;
      }
      if (input === "U") {
        onAction({ type: "upgrade_all" });
        return;
      }
      if (input === "p") {
        onAction({
          type: row.pinned ? "unpin" : "pin",
          name: row.name,
        });
        return;
      }
      if (input === "1") handleSort("name");
      if (input === "2") handleSort("version");
      if (input === "3") handleSort("deps");
      if (input === "4") handleSort("status");
    },
    { isActive: isFocused },
  );

  if (loading && !data) return <Loading message="Loading formulae..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refresh} />;

  const columns: Column<FormulaInfo>[] = [
    {
      key: "name",
      header: "Name",
      width: "flex",
      render: (row) => {
        const desc = row.desc ? ` - ${truncate(row.desc, 40)}` : "";
        const marker = !isInstalledOnRequest(row) ? " (dep)" : "";
        return `${row.name}${marker}${desc}`;
      },
      color: (row) => {
        if (row.pinned) return colors.pink;
        if (!isInstalledOnRequest(row)) return colors.subtext;
        return undefined;
      },
    },
    {
      key: "version",
      header: "Version",
      width: 14,
      render: (row) => row.versions.stable ?? "-",
    },
    {
      key: "deps",
      header: "Deps",
      width: 6,
      align: "right",
      render: (row) => String(row.dependencies.length),
    },
    {
      key: "status",
      header: "Status",
      width: 12,
      render: (row) => {
        if (row.outdated) return "outdated";
        if (row.pinned) return "pinned";
        return "ok";
      },
      color: (row) => {
        if (row.outdated) return colors.warning;
        if (row.pinned) return colors.pink;
        return colors.success;
      },
    },
  ];

  const tableHeight = height - 4 - STATUS_BAR_HEIGHT;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Box gap={1}>
          <Text bold color={colors.primary}>
            Formulae
          </Text>
          <Text color={colors.muted}>({sortedData.length})</Text>
          <Text color={colors.accent}>
            [{viewModeLabels[viewMode]}]
          </Text>
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
            [v] View  [f] Filter  [r] Refresh  [1-4] Sort
          </Text>
        </Box>
      </Box>

      <Table<FormulaInfo>
        columns={columns}
        data={sortedData}
        selectedIndex={selectedIndex}
        onChangeIndex={setSelectedIndex}
        onSelect={(row) => onViewDetail(row.name)}
        isFocused={isFocused && !filterMode}
        height={tableHeight}
        sortColumn={sortKey}
        sortDirection={sortDir}
        onSort={handleSort}
        width={Math.max(56, width - SIDEBAR_WIDTH - 4)}
        emptyMessage={
          filter
            ? "No formulae match filter"
            : viewMode !== "all"
              ? `No ${viewModeLabels[viewMode].toLowerCase()} formulae`
              : "No formulae installed"
        }
      />
    </Box>
  );
}
