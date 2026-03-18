import React from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { Loading, ErrorDisplay } from "../components/Loading.tsx";
import * as brew from "../brew/index.ts";

interface Stats {
  formulaeCount: number;
  casksCount: number;
  outdatedFormulae: number;
  outdatedCasks: number;
  servicesCount: number;
  tapsCount: number;
  cacheSize: string;
}

async function loadStats(): Promise<Stats> {
  const [formulae, casks, outdated, services, taps, cacheSize] =
    await Promise.all([
      brew.formula.listInstalled().catch(() => []),
      brew.cask.listInstalled().catch(() => []),
      brew.formula.outdated().catch(() => ({ formulae: [], casks: [] })),
      brew.service.list().catch(() => []),
      brew.tap.list().catch(() => []),
      brew.cleanup.cacheSize().catch(() => "unknown"),
    ]);

  return {
    formulaeCount: formulae.length,
    casksCount: casks.length,
    outdatedFormulae: outdated.formulae.length,
    outdatedCasks: outdated.casks.length,
    servicesCount: services.length,
    tapsCount: taps.length,
    cacheSize,
  };
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={2}
      paddingY={1}
      flexDirection="column"
      alignItems="center"
      width={22}
    >
      <Text color={color} bold>
        {String(value)}
      </Text>
      <Text color={colors.subtext}>{label}</Text>
    </Box>
  );
}

interface DashboardProps {
  isFocused: boolean;
}

export function Dashboard({ isFocused }: DashboardProps) {
  const { colors } = useTheme();
  const { data: stats, loading, refreshing, error, refresh } = useAsync(
    "dashboard",
    loadStats,
  );

  useInput(
    (input) => {
      if (input === "r") {
        refresh();
      }
    },
    { isActive: isFocused },
  );

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refresh} />;
  if (!stats) return null;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
      <Box gap={1}>
        <Text bold color={colors.primary}>
          Homebrew Overview
        </Text>
        {refreshing && <Text color={colors.warning}>refreshing...</Text>}
        <Text color={colors.muted}>[r] Refresh</Text>
      </Box>

      <Box gap={1} flexWrap="wrap">
        <StatCard
          label="Formulae"
          value={stats.formulaeCount}
          color={colors.primary}
        />
        <StatCard
          label="Casks"
          value={stats.casksCount}
          color={colors.accent}
        />
        <StatCard
          label="Outdated"
          value={stats.outdatedFormulae + stats.outdatedCasks}
          color={
            stats.outdatedFormulae + stats.outdatedCasks > 0
              ? colors.warning
              : colors.success
          }
        />
      </Box>

      <Box gap={1} flexWrap="wrap">
        <StatCard
          label="Services"
          value={stats.servicesCount}
          color={colors.teal}
        />
        <StatCard
          label="Taps"
          value={stats.tapsCount}
          color={colors.lavender}
        />
        <StatCard
          label="Cache"
          value={stats.cacheSize}
          color={colors.peach}
        />
      </Box>

      {(stats.outdatedFormulae > 0 || stats.outdatedCasks > 0) && (
        <Box marginTop={1} flexDirection="column">
          <Text color={colors.warning} bold>
            Updates Available
          </Text>
          {stats.outdatedFormulae > 0 && (
            <Text color={colors.subtext}>
              {stats.outdatedFormulae} formula(e) can be upgraded
            </Text>
          )}
          {stats.outdatedCasks > 0 && (
            <Text color={colors.subtext}>
              {stats.outdatedCasks} cask(s) can be upgraded
            </Text>
          )}
          <Text color={colors.muted}>
            Navigate to Formulae/Casks page and press [u] to upgrade
          </Text>
        </Box>
      )}
    </Box>
  );
}
