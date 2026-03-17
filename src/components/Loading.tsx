import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { colors } from "../theme.ts";

interface LoadingProps {
  message?: string;
}

export function Loading({ message = "Loading..." }: LoadingProps) {
  return (
    <Box justifyContent="center" alignItems="center" flexGrow={1}>
      <Text color={colors.primary}>
        <Spinner type="dots" />
      </Text>
      <Text color={colors.muted}> {message}</Text>
    </Box>
  );
}

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <Box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      flexGrow={1}
      gap={1}
    >
      <Text color={colors.error} bold>
        Error
      </Text>
      <Text color={colors.subtext}>{message}</Text>
      {onRetry && (
        <Text color={colors.muted}>[r] Retry</Text>
      )}
    </Box>
  );
}
