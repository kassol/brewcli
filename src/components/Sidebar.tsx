import React from "react";
import { Box, Text, useInput } from "ink";
import { SIDEBAR_WIDTH } from "../theme.ts";
import { useTheme } from "../hooks/useTheme.tsx";

export interface SidebarSection {
  header: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  key: string;
  label: string;
  badge?: number;
  badgeColor?: string;
}

interface SidebarProps {
  sections: SidebarSection[];
  activeKey: string;
  selectedIndex: number;
  onSelect: (key: string) => void;
  onChangeIndex: (index: number) => void;
  isFocused: boolean;
}

function getAllItems(sections: SidebarSection[]): SidebarItem[] {
  return sections.flatMap((s) => s.items);
}

export function Sidebar({
  sections,
  activeKey,
  selectedIndex,
  onSelect,
  onChangeIndex,
  isFocused,
}: SidebarProps) {
  const { colors } = useTheme();
  const allItems = getAllItems(sections);

  useInput(
    (input, key) => {
      if (input === "j" || key.downArrow) {
        onChangeIndex(Math.min(selectedIndex + 1, allItems.length - 1));
      }
      if (input === "k" || key.upArrow) {
        onChangeIndex(Math.max(selectedIndex - 1, 0));
      }
      if (key.return) {
        const item = allItems[selectedIndex];
        if (item) onSelect(item.key);
      }
    },
    { isActive: isFocused },
  );

  let globalIndex = 0;

  return (
    <Box
      flexDirection="column"
      width={SIDEBAR_WIDTH}
      borderStyle="single"
      borderColor={isFocused ? colors.primary : colors.muted}
      paddingX={1}
    >
      <Box marginBottom={1} justifyContent="center">
        <Text bold color={colors.primary}>
          BREWCLI
        </Text>
      </Box>

      {sections.map((section) => (
        <Box key={section.header} flexDirection="column">
          <Box marginTop={globalIndex > 0 ? 1 : 0}>
            <Text color={colors.muted} dimColor>
              {section.header}
            </Text>
          </Box>
          {section.items.map((item) => {
            const idx = globalIndex++;
            const isActive = item.key === activeKey;
            const isSelected = idx === selectedIndex && isFocused;

            return (
              <Box key={item.key} justifyContent="space-between">
                <Text
                  bold={isActive}
                  inverse={isSelected}
                  color={
                    isSelected
                      ? undefined
                      : isActive
                        ? colors.primary
                        : colors.subtext
                  }
                >
                  {isSelected ? "> " : "  "}
                  {item.label}
                </Text>
                {item.badge != null && item.badge > 0 && (
                  <Text color={item.badgeColor ?? colors.muted}>
                    {item.badge}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
