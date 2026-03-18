import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useTheme } from "../hooks/useTheme.tsx";
import { ModalBox } from "./ModalBox.tsx";

interface InputDialogProps {
  title: string;
  hint: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InputDialog({
  title,
  hint,
  placeholder,
  onSubmit,
  onCancel,
}: InputDialogProps) {
  const { colors } = useTheme();
  const [value, setValue] = useState("");

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return && value.trim()) {
      onSubmit(value.trim());
      return;
    }
  });

  return (
    <ModalBox width={58} borderColor={colors.primary}>
      <Text bold color={colors.primary} backgroundColor={colors.base}>
        {title}
      </Text>
      <Text color={colors.muted} backgroundColor={colors.base}>{hint}</Text>

      <Box marginTop={1}>
        <Text color={colors.accent} bold backgroundColor={colors.base}>
          {">"}{" "}
        </Text>
        <TextInput
          value={value}
          onChange={setValue}
          placeholder={placeholder ?? ""}
        />
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted} backgroundColor={colors.base}>
          [Enter] Submit  [Esc] Cancel
        </Text>
      </Box>
    </ModalBox>
  );
}
