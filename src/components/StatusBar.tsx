import React from "react";
import { Box, Text } from "ink";
import type { ColorScheme } from "../theme.ts";
import { useTheme } from "../hooks/useTheme.tsx";

interface StatusBarProps {
  page: string;
  mode: string;
  notification?: string | null;
  loading?: boolean;
  colorScheme?: ColorScheme;
}

const keyHints: Record<string, string> = {
  normal:   "[/] Search  [?] Help  [Tab] Focus  [t] Theme  [q] Quit",
  search: "[Enter] Select  [Esc] Close  [Up/Down] Navigate",
  detail: "[Esc] Back  [Tab] Tabs  [i] Install  [d] Uninstall  [u] Upgrade",
  confirm: "[y] Confirm  [n] Cancel",
  help: "[Esc] or [?] Close help",
  input: "[Enter] Submit  [Esc] Cancel",
};

const pageLabels: Record<string, string> = {
  dashboard: "Dashboard",
  formulae: "Formulae",
  casks: "Casks",
  outdated: "Outdated",
  services: "Services",
  taps: "Taps",
  cleanup: "Cleanup",
};

export function StatusBar({ page, mode, notification, loading, colorScheme }: StatusBarProps) {
  const { colors } = useTheme();
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
      <Box>
        <Text color={colors.muted}>
          {keyHints[mode] ?? keyHints.normal}
        </Text>
      </Box>

      <Box gap={2}>
        {notification && (
          <Text
            color={
              notification.startsWith("Error")
                ? colors.error
                : colors.success
            }
          >
            {notification}
          </Text>
        )}
        {loading && <Text color={colors.warning}>Working...</Text>}
        <Text color={colors.muted}>{pageLabel}</Text>
        <Text color={colors.muted}>{colorScheme === "light" ? "light" : "dark"}</Text>
      </Box>
    </Box>
  );
}
