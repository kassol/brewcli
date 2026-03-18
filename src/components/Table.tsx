import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

export interface Column<T> {
  key: string;
  header: string;
  width: number | "flex";
  align?: "left" | "right";
  render?: (row: T) => string;
  color?: (row: T) => string | undefined;
}

export type SortDirection = "asc" | "desc";

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  selectedIndex: number;
  onChangeIndex: (index: number) => void;
  onSelect?: (row: T, index: number) => void;
  isFocused: boolean;
  height: number;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string) => void;
  checkedIndices?: Set<number>;
  onToggleCheck?: (index: number) => void;
  emptyMessage?: string;
  width?: number;
}

function clip(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text;
  if (width === 1) return "~";
  return `${text.slice(0, width - 1)}~`;
}

function pad(text: string, width: number, align: "left" | "right" = "left"): string {
  const clipped = clip(text, width);
  if (clipped.length >= width) return clipped;
  const padding = " ".repeat(width - clipped.length);
  return align === "right" ? padding + clipped : clipped + padding;
}

export function Table<T>({
  columns,
  data,
  selectedIndex,
  onChangeIndex,
  onSelect,
  isFocused,
  height,
  sortColumn,
  sortDirection,
  onSort,
  checkedIndices,
  onToggleCheck,
  emptyMessage = "No data",
  width,
}: TableProps<T>) {
  const { colors } = useTheme();
  // Visible rows (header takes 2 lines: header + separator)
  const visibleRows = Math.max(1, height - 2);

  const scrollOffset = useMemo(() => {
    if (data.length <= visibleRows) return 0;
    const half = Math.floor(visibleRows / 2);
    if (selectedIndex <= half) return 0;
    if (selectedIndex >= data.length - visibleRows + half) {
      return Math.max(0, data.length - visibleRows);
    }
    return selectedIndex - half;
  }, [selectedIndex, data.length, visibleRows]);

  useInput(
    (input, key) => {
      if (input === "j" || key.downArrow) {
        onChangeIndex(Math.min(selectedIndex + 1, data.length - 1));
      }
      if (input === "k" || key.upArrow) {
        onChangeIndex(Math.max(selectedIndex - 1, 0));
      }
      if (key.return && onSelect && data[selectedIndex]) {
        onSelect(data[selectedIndex], selectedIndex);
      }
      if (input === "G") {
        onChangeIndex(data.length - 1);
      }
      if (input === "g") {
        onChangeIndex(0);
      }
      if (input === " " && onToggleCheck) {
        onToggleCheck(selectedIndex);
      }
      if (input === "s" && onSort && sortColumn) {
        onSort(sortColumn);
      }
    },
    { isActive: isFocused },
  );

  if (data.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" height={height}>
        <Text color={colors.muted}>{emptyMessage}</Text>
      </Box>
    );
  }

  const visibleData = data.slice(scrollOffset, scrollOffset + visibleRows);
  const hasCheckbox = checkedIndices != null;
  const totalWidth = width ?? process.stdout.columns ?? 120;
  const fixedWidth = columns.reduce(
    (sum, col) => sum + (col.width === "flex" ? 0 : col.width),
    0,
  );
  const flexColumns = columns.filter((col) => col.width === "flex").length;
  const checkboxWidth = hasCheckbox ? 4 : 0;
  const remainingWidth = Math.max(16, totalWidth - fixedWidth - checkboxWidth);
  const flexWidth =
    flexColumns > 0 ? Math.max(24, Math.floor(remainingWidth / flexColumns)) : 0;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        {hasCheckbox && (
          <Box width={4}>
            <Text bold color={colors.subtext}>
              {"  "}
            </Text>
          </Box>
        )}
        {columns.map((col, colIndex) => {
          const w = col.width === "flex" ? flexWidth : col.width;
          const sortIndicator =
            sortColumn === col.key
              ? sortDirection === "asc"
                ? " ^"
                : " v"
              : "";
          const headerText = `${colIndex === 0 ? "  " : " "}${col.header}${sortIndicator}`;
          return (
            <Box key={col.key} width={w} flexGrow={0}>
              <Text bold color={colors.subtext}>
                {pad(headerText, w)}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Separator */}
      <Box>
        <Text color={colors.muted}>
          {"-".repeat(Math.max(20, totalWidth))}
        </Text>
      </Box>

      {/* Rows */}
      {visibleData.map((row, i) => {
        const globalIndex = scrollOffset + i;
        const isSelected = globalIndex === selectedIndex;
        const isChecked = checkedIndices?.has(globalIndex);

        return (
          <Box key={globalIndex}>
            {hasCheckbox && (
              <Box width={4}>
                <Text color={isChecked ? colors.success : colors.muted}>
                  {isChecked ? "[x] " : "[ ] "}
                </Text>
              </Box>
            )}
            {columns.map((col, colIndex) => {
              const value = col.render
                ? col.render(row)
                : String((row as Record<string, unknown>)[col.key] ?? "");
              const cellColor = col.color ? col.color(row) : undefined;
              const w = col.width === "flex" ? flexWidth : col.width;
              const prefix = colIndex === 0
                ? isSelected && isFocused
                  ? "> "
                  : "  "
                : " ";
              const cellValue = pad(
                `${prefix}${value}`,
                colIndex === 0 ? w : w,
                col.align,
              );

              return (
                <Box
                  key={col.key}
                  width={w}
                  flexGrow={0}
                >
                  <Text
                    inverse={isSelected && isFocused}
                    color={
                      isSelected && isFocused
                        ? undefined
                        : cellColor ?? colors.text
                    }
                    bold={isSelected && isFocused}
                  >
                    {cellValue}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })}

      {/* Scroll indicator */}
      {data.length > visibleRows && (
        <Box justifyContent="flex-end" marginTop={0}>
          <Text color={colors.muted}>
            {" "}
            [{scrollOffset + 1}-{Math.min(scrollOffset + visibleRows, data.length)}/{data.length}]
          </Text>
        </Box>
      )}
    </Box>
  );
}
