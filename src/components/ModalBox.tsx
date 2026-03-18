import React, { useRef, useState, useEffect } from "react";
import { Box, Text, measureElement, type DOMElement } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

interface ModalBoxProps {
  width: number;
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
 * Fix: render the bordered content first, measure its actual height via
 * measureElement, then render a matching background fill layer underneath.
 * This ensures background and border always fit perfectly regardless of
 * content size.
 */
export function ModalBox({ width, children, borderColor }: ModalBoxProps) {
  const { colors } = useTheme();
  const color = borderColor ?? colors.primary;
  const contentRef = useRef<DOMElement>(null);
  const [bgHeight, setBgHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      const measured = measureElement(contentRef.current);
      if (measured.height !== bgHeight) {
        setBgHeight(measured.height);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Box flexDirection="column" width={width}>
          {/* Background fill layer — sized to match measured content */}
          {bgHeight > 0 &&
            Array.from({ length: bgHeight }, (_, i) => (
              <Text key={i} backgroundColor={colors.base}>
                {" ".repeat(width)}
              </Text>
            ))}
          {/* Bordered content overlays the background */}
          <Box
            ref={contentRef}
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
        {bgHeight > 0 && (
          <Box flexDirection="column">
            <Text> </Text>
            {Array.from({ length: bgHeight - 1 }, (_, i) => (
              <Text key={i} backgroundColor={colors.crust}>
                {" ".repeat(1)}
              </Text>
            ))}
          </Box>
        )}
      </Box>
      {/* Bottom shadow edge */}
      {bgHeight > 0 && (
        <Box>
          <Text> </Text>
          <Text backgroundColor={colors.crust}>{" ".repeat(width)}</Text>
        </Box>
      )}
    </Box>
  );
}
