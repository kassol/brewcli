import React from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme.ts";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  useInput((input, key) => {
    if (input === "y" || input === "Y" || key.return) {
      onConfirm();
    }
    if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={destructive ? colors.error : colors.warning}
      paddingX={2}
      paddingY={1}
      width={58}
    >
      <Text bold color={destructive ? colors.error : colors.warning}>
        {title}
      </Text>
      <Box marginY={1} flexDirection="column">
        <Text color={colors.text}>{message}</Text>
        <Text color={colors.muted}>
          {destructive ? "This action may be hard to undo." : "Press Enter or Y to continue."}
        </Text>
      </Box>
      <Box gap={2}>
        <Text color={destructive ? colors.error : colors.success} bold>
          [Enter / Y] Confirm
        </Text>
        <Text color={colors.muted} bold>
          [Esc / N] Cancel
        </Text>
      </Box>
    </Box>
  );
}
