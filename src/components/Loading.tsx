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
      <Box
        borderStyle="round"
        borderColor={colors.highlight}
        paddingX={2}
        paddingY={1}
      >
        <Text color={colors.primary}>
          <Spinner type="dots" />
        </Text>
        <Text color={colors.text}> {message}</Text>
      </Box>
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
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.error}
        paddingX={2}
        paddingY={1}
      >
        <Text color={colors.error} bold>
          Could not load this view
        </Text>
        <Text color={colors.subtext}>{message}</Text>
        {onRetry && (
          <Box marginTop={1}>
            <Text color={colors.muted}>Press [r] to retry</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
