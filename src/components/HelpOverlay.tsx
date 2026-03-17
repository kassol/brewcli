import React from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme.ts";

interface HelpOverlayProps {
  onClose: () => void;
}

interface HelpEntry {
  key: string;
  desc: string;
}

const sections: { title: string; entries: HelpEntry[] }[] = [
  {
    title: "Global",
    entries: [
      { key: "q", desc: "Quit" },
      { key: "/", desc: "Global search" },
      { key: "?", desc: "Toggle this help" },
      { key: "Tab", desc: "Switch sidebar / main focus" },
      { key: "h / l", desc: "Focus sidebar / main" },
    ],
  },
  {
    title: "List Navigation",
    entries: [
      { key: "j / k", desc: "Move down / up" },
      { key: "g / G", desc: "Jump to first / last" },
      { key: "Enter", desc: "View details / select" },
      { key: "f", desc: "Filter list" },
      { key: "Esc", desc: "Clear filter / close overlay" },
      { key: "Space", desc: "Toggle checkbox" },
    ],
  },
  {
    title: "Package Actions",
    entries: [
      { key: "d", desc: "Uninstall package" },
      { key: "u", desc: "Upgrade package" },
      { key: "U", desc: "Upgrade all outdated" },
      { key: "p", desc: "Pin / Unpin formula" },
      { key: "r", desc: "Refresh data" },
      { key: "t", desc: "Toggle view: all / intentional / deps" },
    ],
  },
  {
    title: "Sort",
    entries: [
      { key: "1-4", desc: "Sort by column (Formulae/Casks)" },
    ],
  },
  {
    title: "Detail View",
    entries: [
      { key: "Tab", desc: "Switch between Info / Deps / Uses tabs" },
      { key: "i", desc: "Install" },
      { key: "Esc", desc: "Close detail" },
    ],
  },
  {
    title: "Services",
    entries: [
      { key: "s", desc: "Start / Stop service" },
      { key: "R", desc: "Restart service" },
    ],
  },
];

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  useInput((_input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      paddingX={2}
      paddingY={1}
      width={56}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={colors.primary}>
          Keyboard Shortcuts
        </Text>
      </Box>

      {sections.map((section) => (
        <Box key={section.title} flexDirection="column" marginBottom={1}>
          <Text bold color={colors.accent}>
            {section.title}
          </Text>
          {section.entries.map((entry) => (
            <Box key={entry.key}>
              <Box width={14}>
                <Text color={colors.warning}>{entry.key}</Text>
              </Box>
              <Text color={colors.subtext}>{entry.desc}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box justifyContent="center">
        <Text color={colors.muted}>[Esc] or [?] Close</Text>
      </Box>
    </Box>
  );
}
