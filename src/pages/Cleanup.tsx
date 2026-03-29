import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { Loading } from "../components/Loading.tsx";
import * as brew from "../brew/index.ts";

interface CleanupState {
  dryRunResult: string | null;
  running: boolean;
  lastAction: string | null;
}

interface CleanupProps {
  isFocused: boolean;
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}

export function Cleanup({ isFocused, onNotify }: CleanupProps) {
  const { colors } = useTheme();
  const { data: cacheSize, loading: cacheSizeLoading } = useAsync(
    "cleanup:cacheSize",
    () => brew.cleanup.cacheSize(),
    { ttl: 60_000 },
  );

  const [state, setState] = useState<CleanupState>({
    dryRunResult: null,
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
            : {}),
        }));
        if (action === "clean-all") {
          onNotify("Cleanup complete", "success");
        }
      } catch (e) {
        setState((s) => ({ ...s, running: false }));
        onNotify(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    },
    [onNotify],
  );

  useInput(
    (input) => {
      if (state.running) return;

      if (input === "p") {
        runAction("dry-run", () => brew.cleanup.cleanAll(true));
        return;
      }
      if (input === "c") {
        runAction("clean-all", () => brew.cleanup.cleanAll(false));
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
            [p] Preview (dry-run)
          </Text>
          <Text color={colors.text}>
            [c] Clean all (prune cache + remove unused deps)
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
            Preview:
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

    </Box>
  );
}
