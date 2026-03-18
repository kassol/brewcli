import React from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";
import { ModalBox } from "./ModalBox.tsx";

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
      { key: "?", desc: "Toggle this help" },
      { key: "S", desc: "Search packages (brew search)" },
      { key: "t", desc: "Toggle light/dark theme" },
      { key: "Tab", desc: "Switch sidebar / main focus" },
      { key: "h / l", desc: "Focus sidebar / main" },
    ],
  },
  {
    title: "Sidebar",
    entries: [
      { key: "j / k", desc: "Navigate and switch page" },
      { key: "Enter / l", desc: "Focus main panel" },
    ],
  },
  {
    title: "List Navigation",
    entries: [
      { key: "j / k", desc: "Move down / up" },
      { key: "g / G", desc: "Jump to first / last" },
      { key: "Enter", desc: "View details" },
      { key: "/", desc: "Filter list" },
      { key: "Esc", desc: "Clear filter / close overlay" },
      { key: "r", desc: "Refresh data" },
      { key: "1-4", desc: "Sort by column" },
    ],
  },
  {
    title: "Package Actions",
    entries: [
      { key: "d", desc: "Uninstall package" },
      { key: "u", desc: "Upgrade package" },
      { key: "U", desc: "Upgrade all outdated" },
      { key: "p", desc: "Pin / Unpin formula" },
      { key: "v", desc: "Cycle view: all / intentional / deps" },
    ],
  },
  {
    title: "Detail View",
    entries: [
      { key: "Tab", desc: "Switch Info / Deps / Uses tabs" },
      { key: "i", desc: "Install" },
      { key: "d", desc: "Uninstall" },
      { key: "u", desc: "Upgrade" },
      { key: "p", desc: "Pin / Unpin" },
      { key: "Esc", desc: "Close" },
    ],
  },
  {
    title: "Services & Taps",
    entries: [
      { key: "s", desc: "Start / Stop service" },
      { key: "R", desc: "Restart service" },
      { key: "a", desc: "Add tap" },
    ],
  },
  {
    title: "Cleanup",
    entries: [
      { key: "p", desc: "Preview cleanup" },
      { key: "c", desc: "Run cleanup" },
      { key: "a / A", desc: "Preview / Run autoremove" },
      { key: "D", desc: "Run brew doctor" },
    ],
  },
];

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  const { colors } = useTheme();
  useInput((input, key) => {
    if (key.escape || input === "?") {
      onClose();
    }
  });

  return (
    <ModalBox width={56} borderColor={colors.primary}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={colors.primary} backgroundColor={colors.base}>
          Keyboard Shortcuts
        </Text>
      </Box>

      {sections.map((section) => (
        <Box key={section.title} flexDirection="column" marginBottom={1}>
          <Text bold color={colors.accent} backgroundColor={colors.base}>
            {section.title}
          </Text>
          {section.entries.map((entry) => (
            <Box key={entry.key}>
              <Box width={14}>
                <Text color={colors.warning} backgroundColor={colors.base}>{entry.key}</Text>
              </Box>
              <Text color={colors.subtext} backgroundColor={colors.base}>{entry.desc}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box justifyContent="center">
        <Text color={colors.muted} backgroundColor={colors.base}>[Esc] or [?] Close</Text>
      </Box>
    </ModalBox>
  );
}
