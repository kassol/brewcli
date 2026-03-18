import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme.ts";
import { useAsync } from "../hooks/useAsync.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";
import { Table, type Column } from "../components/Table.tsx";
import { Loading, ErrorDisplay } from "../components/Loading.tsx";
import { SIDEBAR_WIDTH, STATUS_BAR_HEIGHT } from "../theme.ts";
import * as brew from "../brew/index.ts";

interface TapRow {
  name: string;
  official: boolean;
}

export type TapAction =
  | { type: "add_tap" }
  | { type: "remove_tap"; name: string };

interface TapsProps {
  isFocused: boolean;
  onAction: (action: TapAction) => void;
}

export function Taps({ isFocused, onAction }: TapsProps) {
  const { data, loading, refreshing, error, refresh } = useAsync(
    "taps",
    async () => {
      const taps = await brew.tap.list();
      return taps.map(
        (name): TapRow => ({
          name,
          official: name.startsWith("homebrew/"),
        }),
      );
    },
  );
  const { height, width } = useTerminalSize();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput(
    (input) => {
      if (input === "r") {
        refresh();
        return;
      }
      if (input === "a") {
        onAction({ type: "add_tap" });
        return;
      }
      const row = data?.[selectedIndex];
      if (!row) return;

      if (input === "d") {
        onAction({ type: "remove_tap", name: row.name });
        return;
      }
    },
    { isActive: isFocused },
  );

  if (loading && !data) return <Loading message="Loading taps..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refresh} />;

  const columns: Column<TapRow>[] = [
    {
      key: "name",
      header: "Tap",
      width: "flex",
      render: (row) => row.name,
    },
    {
      key: "official",
      header: "Type",
      width: 16,
      render: (row) => (row.official ? "Official" : "Third-party"),
      color: (row) => (row.official ? colors.success : colors.peach),
    },
  ];

  const tableHeight = height - 4 - STATUS_BAR_HEIGHT;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingX={1} justifyContent="space-between">
        <Box gap={1}>
          <Text bold color={colors.lavender}>
            Taps
          </Text>
          <Text color={colors.muted}>({data?.length ?? 0})</Text>
          {refreshing && <Text color={colors.warning}>Refreshing</Text>}
        </Box>
        <Text color={colors.muted}>
          [a] Add Tap  [d] Remove  [r] Refresh
        </Text>
      </Box>

      <Table<TapRow>
        columns={columns}
        data={data ?? []}
        selectedIndex={selectedIndex}
        onChangeIndex={setSelectedIndex}
        isFocused={isFocused}
        height={tableHeight}
        width={Math.max(56, width - SIDEBAR_WIDTH - 4)}
        emptyMessage="No taps configured"
      />
    </Box>
  );
}
