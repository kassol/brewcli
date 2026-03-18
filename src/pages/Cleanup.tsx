import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { Loading } from "../components/Loading.tsx";
import * as brew from "../brew/index.ts";

interface CleanupState {
  cacheSize: string;
  dryRunResult: string | null;
  autoremoveResult: string | null;
  running: boolean;
  lastAction: string | null;
}

interface CleanupProps {
  isFocused: boolean;
  onNotify: (message: string) => void;
}

export function Cleanup({ isFocused, onNotify }: CleanupProps) {
  const { colors } = useTheme();
  const { data: cacheSize, loading: cacheSizeLoading } = useAsync(
    "cleanup:cacheSize",
    () => brew.cleanup.cacheSize(),
    { ttl: 60_000 },
  );

  const [state, setState] = useState<CleanupState>({
    cacheSize: "",
    dryRunResult: null,
    autoremoveResult: null,
    running: false,
    lastAction: null,
  });

  const runAction = useCallback(
    async (action: string, fn: () => Promise<string>) => {
      setState((s) => ({ ...s, running: true, lastAction: action }));
      try {
        const result = await fn();
        setState((s) => ({
          ...s,
          running: false,
          ...(action === "dry-run"
            ? { dryRunResult: result || "Nothing to clean up" }
            : action === "autoremove-dry"
              ? { autoremoveResult: result || "Nothing to remove" }
              : {}),
        }));
        if (action === "cleanup") {
          onNotify("Cleanup complete");
        } else if (action === "autoremove") {
          onNotify("Autoremove complete");
        }
      } catch (e) {
        setState((s) => ({ ...s, running: false }));
        onNotify(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [onNotify],
  );

  useInput(
    (input) => {
      if (state.running) return;

      if (input === "p") {
        runAction("dry-run", () => brew.cleanup.cleanup(true));
        return;
      }
      if (input === "c") {
        runAction("cleanup", () => brew.cleanup.cleanup(false));
        return;
      }
      if (input === "a") {
        runAction("autoremove-dry", () => brew.cleanup.autoremove(true));
        return;
      }
      if (input === "A") {
        runAction("autoremove", () => brew.cleanup.autoremove(false));
        return;
      }
      if (input === "D") {
        runAction("doctor", () => brew.cleanup.doctor());
        return;
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
      <Text bold color={colors.peach}>
        Cleanup & Maintenance
      </Text>

      {/* Cache info */}
      <Box flexDirection="column" gap={0}>
        <Box gap={1}>
          <Text color={colors.subtext}>Cache size:</Text>
          {cacheSizeLoading ? (
            <Text color={colors.muted}>calculating...</Text>
          ) : (
            <Text color={colors.text} bold>
              {cacheSize ?? "unknown"}
            </Text>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box flexDirection="column" gap={1} marginTop={1}>
        <Text bold color={colors.subtext}>
          Actions
        </Text>
        <Box flexDirection="column">
          <Text color={colors.text}>
            [p] Preview cleanup (dry-run)
          </Text>
          <Text color={colors.text}>
            [c] Run cleanup (remove old versions + cache)
          </Text>
          <Text color={colors.text}>
            [a] Preview autoremove (dry-run)
          </Text>
          <Text color={colors.text}>
            [A] Run autoremove (remove unused dependencies)
          </Text>
          <Text color={colors.text}>
            [D] Run brew doctor
          </Text>
        </Box>
      </Box>

      {/* Running indicator */}
      {state.running && (
        <Loading
          message={`Running ${state.lastAction}...`}
        />
      )}

      {/* Dry run results */}
      {state.dryRunResult && !state.running && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={colors.warning}>
            Cleanup Preview:
          </Text>
          <Box
            borderStyle="single"
            borderColor={colors.muted}
            paddingX={1}
            flexDirection="column"
          >
            {state.dryRunResult
              .split("\n")
              .filter(Boolean)
              .slice(0, 20)
              .map((line, i) => (
                <Text key={i} color={colors.subtext}>
                  {line}
                </Text>
              ))}
            {state.dryRunResult.split("\n").filter(Boolean).length > 20 && (
              <Text color={colors.muted}>
                ... and{" "}
                {state.dryRunResult.split("\n").filter(Boolean).length - 20}{" "}
                more
              </Text>
            )}
          </Box>
        </Box>
      )}

      {/* Autoremove results */}
      {state.autoremoveResult && !state.running && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={colors.warning}>
            Autoremove Preview:
          </Text>
          <Box
            borderStyle="single"
            borderColor={colors.muted}
            paddingX={1}
            flexDirection="column"
          >
            {state.autoremoveResult
              .split("\n")
              .filter(Boolean)
              .slice(0, 20)
              .map((line, i) => (
                <Text key={i} color={colors.subtext}>
                  {line}
                </Text>
              ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
