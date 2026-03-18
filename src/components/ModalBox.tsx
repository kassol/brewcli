import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

interface ModalBoxProps {
  width: number;
  /** Number of background fill lines. Defaults to 15. Increase for taller dialogs. */
  height?: number;
  children: React.ReactNode;
  borderColor?: string;
}

/**
 * Modal wrapper with solid opaque background and drop shadow.
 *
 * Ink's Box does NOT support backgroundColor — only Text does.
 * Padding, margin, and gap areas inside a Box are always transparent,
 * so underlying page content bleeds through.
 *
 * Fix: render a layer of full-width space characters with backgroundColor
 * to physically fill every cell, then overlay the bordered content on top
 * using position="absolute". The background layer sets the visual height;
 * the bordered content floats above it.
 */
export function ModalBox({ width, height, children, borderColor }: ModalBoxProps) {
  const { colors } = useTheme();
  const color = borderColor ?? colors.primary;
  const bgHeight = height ?? 15;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Box flexDirection="column" width={width}>
          {/* Background fill layer — sets visual size, covers underlying content */}
          {Array.from({ length: bgHeight }, (_, i) => (
            <Text key={i} backgroundColor={colors.base}>
              {" ".repeat(width)}
            </Text>
          ))}
          {/* Bordered content overlays the background */}
          <Box
            position="absolute"
            flexDirection="column"
            borderStyle="round"
            borderColor={color}
            paddingX={3}
            paddingY={1}
            width={width}
          >
            {children}
          </Box>
        </Box>
        {/* Right shadow edge */}
        <Box flexDirection="column">
          <Text> </Text>
          {Array.from({ length: bgHeight - 1 }, (_, i) => (
            <Text key={i} backgroundColor={colors.crust}> </Text>
          ))}
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
