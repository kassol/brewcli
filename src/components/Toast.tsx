import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

interface ToastProps {
  message: ToastMessage | null;
  terminalWidth: number;
}

const TOAST_MAX_WIDTH = 60;
const ICON_OVERHEAD = 3;

function toastIcon(type: ToastType): string {
  switch (type) {
    case "success": return "\u2713";
    case "error": return "\u2717";
    case "info": return "i";
  }
}

function formatToastText(text: string): string {
  const maxTextLen = TOAST_MAX_WIDTH - ICON_OVERHEAD - 4;
  if (text.length > maxTextLen) {
    return text.slice(0, maxTextLen - 3) + "...";
  }
  return text;
}

export function toastDuration(type: ToastType): number {
  return type === "error" ? 5000 : 3000;
}

export function Toast({ message, terminalWidth }: ToastProps) {
  const { colors } = useTheme();
  if (!message) return null;

  const formatted = formatToastText(message.text);
  const icon = toastIcon(message.type);
  const toastWidth = Math.min(formatted.length + ICON_OVERHEAD + 4, TOAST_MAX_WIDTH);
  const marginLeft = Math.max(0, Math.floor((terminalWidth - toastWidth) / 2));

  const iconColor =
    message.type === "success" ? colors.success
    : message.type === "error" ? colors.error
    : colors.primary;

  return (
    <Box position="absolute" marginLeft={marginLeft} marginTop={1}>
      <Box borderStyle="round" borderColor={iconColor}>
        <Text backgroundColor={colors.base} color={iconColor} bold>
          {" "}{icon}{" "}
        </Text>
        <Text backgroundColor={colors.base} color={colors.text}>
          {formatted}
        </Text>
      </Box>
    </Box>
  );
}
