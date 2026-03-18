import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { colors } from "../theme.ts";

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
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      paddingX={2}
      paddingY={1}
      width={58}
    >
      <Text bold color={colors.primary}>
        {title}
      </Text>
      <Text color={colors.muted}>{hint}</Text>

      <Box marginTop={1}>
        <Text color={colors.accent} bold>
          {">"}{" "}
        </Text>
        <TextInput
          value={value}
          onChange={setValue}
          placeholder={placeholder ?? ""}
        />
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted}>
          [Enter] Submit  [Esc] Cancel
        </Text>
      </Box>
    </Box>
  );
}
