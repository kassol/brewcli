import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

interface ModalBoxProps {
  width: number;
  children: React.ReactNode;
  borderColor?: string;
}

export function ModalBox({ width, children, borderColor }: ModalBoxProps) {
  const { colors } = useTheme();
  const color = borderColor ?? colors.primary;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={color}
          paddingX={3}
          paddingY={1}
          width={width}
        >
          {children}
        </Box>
        {/* Right shadow edge */}
        <Box flexDirection="column">
          <Text> </Text>
          <Text backgroundColor={colors.crust}> </Text>
        </Box>
      </Box>
      {/* Bottom shadow edge */}
      <Box>
        <Text> </Text>
        <Text backgroundColor={colors.crust}>{" ".repeat(width)}</Text>
      </Box>
    </Box>
  );
}
