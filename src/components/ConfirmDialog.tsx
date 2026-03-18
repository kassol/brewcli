import React from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";
import { ModalBox } from "./ModalBox.tsx";

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
  const { colors } = useTheme();
  useInput((input, key) => {
    if (input === "y" || input === "Y" || key.return) {
      onConfirm();
    }
    if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  const borderColor = destructive ? colors.error : colors.warning;

  return (
    <ModalBox width={58} borderColor={borderColor}>
      <Text bold color={destructive ? colors.error : colors.warning} backgroundColor={colors.base}>
        {title}
      </Text>
      <Box marginY={1} flexDirection="column">
        <Text color={colors.text} backgroundColor={colors.base}>{message}</Text>
        <Text color={colors.muted} backgroundColor={colors.base}>
          {destructive ? "This action may be hard to undo." : "Press Enter or Y to continue."}
        </Text>
      </Box>
      <Box gap={2}>
        <Text color={destructive ? colors.error : colors.success} bold backgroundColor={colors.base}>
          [Enter / Y] Confirm
        </Text>
        <Text color={colors.muted} bold backgroundColor={colors.base}>
          [Esc / N] Cancel
        </Text>
      </Box>
    </ModalBox>
  );
}
