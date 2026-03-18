import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

export interface KeyHint {
  key: string;
  label: string;
}

interface StatusBarProps {
  page: string;
  mode: string;
  hints: KeyHint[];
  loading?: boolean;
}

const pageLabels: Record<string, string> = {
  dashboard: "Dashboard",
  formulae: "Formulae",
  casks: "Casks",
  outdated: "Outdated",
  services: "Services",
  taps: "Taps",
  cleanup: "Cleanup",
};

export function StatusBar({ page, mode, hints, loading }: StatusBarProps) {
  const { colors, colorScheme } = useTheme();
  const pageLabel = pageLabels[page] ?? page;

  return (
    <Box
      borderStyle="single"
      borderColor={colors.muted}
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={1}>
        {hints.map((hint) => (
          <Box key={hint.key}>
            <Text bold color={colors.accent}>[{hint.key}]</Text>
            <Text color={colors.muted}>{hint.label}</Text>
          </Box>
        ))}
      </Box>

      <Box gap={2}>
        {loading && <Text color={colors.warning}>Working...</Text>}
        <Text color={colors.muted}>{pageLabel}</Text>
        <Text color={colors.muted}>{colorScheme}</Text>
      </Box>
    </Box>
  );
}
