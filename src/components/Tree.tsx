import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme.ts";

export interface TreeNode {
  label: string;
  children?: TreeNode[];
  meta?: string;
}

interface FlatNode {
  label: string;
  depth: number;
  isLast: boolean;
  hasChildren: boolean;
  expanded: boolean;
  prefix: string;
  path: string;
  meta?: string;
}

function flattenTree(
  nodes: TreeNode[],
  expanded: Set<string>,
  depth = 0,
  parentPrefix = "",
  parentPath = "",
): FlatNode[] {
  const result: FlatNode[] = [];

  nodes.forEach((node, i) => {
    const isLast = i === nodes.length - 1;
    const path = parentPath ? `${parentPath}/${node.label}` : node.label;
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expanded.has(path);

    let prefix: string;
    if (depth === 0) {
      prefix = "";
    } else {
      const connector = isLast ? "\\-- " : "+-- ";
      prefix = parentPrefix + connector;
    }

    result.push({
      label: node.label,
      depth,
      isLast,
      hasChildren,
      expanded: isExpanded,
      prefix,
      path,
      meta: node.meta,
    });

    if (hasChildren && isExpanded) {
      const childPrefix =
        depth === 0 ? "" : parentPrefix + (isLast ? "    " : "|   ");
      result.push(
        ...flattenTree(node.children!, expanded, depth + 1, childPrefix, path),
      );
    }
  });

  return result;
}

interface TreeProps {
  data: TreeNode[];
  isFocused: boolean;
  height: number;
  selectedIndex?: number;
  onChangeIndex?: (index: number) => void;
  defaultExpanded?: boolean;
}

export function Tree({
  data,
  isFocused,
  height,
  selectedIndex = 0,
  onChangeIndex,
  defaultExpanded = true,
}: TreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (!defaultExpanded) return new Set<string>();
    // Expand all by default
    const all = new Set<string>();
    function walk(nodes: TreeNode[], parentPath = "") {
      for (const node of nodes) {
        const path = parentPath ? `${parentPath}/${node.label}` : node.label;
        if (node.children?.length) {
          all.add(path);
          walk(node.children, path);
        }
      }
    }
    walk(data);
    return all;
  });

  const flatList = useMemo(
    () => flattenTree(data, expanded),
    [data, expanded],
  );

  const visibleRows = Math.max(1, height);
  const scrollOffset = useMemo(() => {
    if (flatList.length <= visibleRows) return 0;
    const half = Math.floor(visibleRows / 2);
    if (selectedIndex <= half) return 0;
    if (selectedIndex >= flatList.length - visibleRows + half) {
      return Math.max(0, flatList.length - visibleRows);
    }
    return selectedIndex - half;
  }, [selectedIndex, flatList.length, visibleRows]);

  useInput(
    (input, key) => {
      if (!onChangeIndex) return;

      if (input === "j" || key.downArrow) {
        onChangeIndex(Math.min(selectedIndex + 1, flatList.length - 1));
      }
      if (input === "k" || key.upArrow) {
        onChangeIndex(Math.max(selectedIndex - 1, 0));
      }
      if (key.return || input === " ") {
        const node = flatList[selectedIndex];
        if (node?.hasChildren) {
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(node.path)) {
              next.delete(node.path);
            } else {
              next.add(node.path);
            }
            return next;
          });
        }
      }
    },
    { isActive: isFocused },
  );

  if (flatList.length === 0) {
    return (
      <Box>
        <Text color={colors.muted}>No dependencies</Text>
      </Box>
    );
  }

  const visible = flatList.slice(scrollOffset, scrollOffset + visibleRows);

  return (
    <Box flexDirection="column">
      {visible.map((node, i) => {
        const globalIndex = scrollOffset + i;
        const isSelected = globalIndex === selectedIndex && isFocused;

        return (
          <Box key={`${node.path}-${globalIndex}`}>
            <Text
              inverse={isSelected}
              color={
                isSelected
                  ? undefined
                  : node.depth === 0
                    ? colors.primary
                    : colors.text
              }
            >
              {node.prefix}
              {node.hasChildren ? (node.expanded ? "v " : "> ") : "  "}
              {node.label}
            </Text>
            {node.meta && (
              <Text color={colors.muted}> ({node.meta})</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// Parse `brew deps --tree` output into TreeNode[]
// Handles both plain-indentation and Unicode tree-drawing characters (├── └── │)
export function parseDepsTree(output: string): TreeNode[] {
  const lines = output.split("\n").filter(Boolean);
  if (lines.length === 0) return [];

  const roots: TreeNode[] = [];
  const stack: { node: TreeNode; depth: number }[] = [];

  for (const line of lines) {
    // Strip tree-drawing characters and leading whitespace to get the label
    const label = line.replace(/^[\s\u2502\u251C\u2514\u2500\u2510\u250C\u2518\u252C\u2524\u253C|+\\`\-─├└│]+/, "").trim();
    if (!label) continue;

    // Determine depth by finding where the label starts in the original line
    const labelStart = line.indexOf(label);
    // brew deps --tree uses 4-char indent per level
    const depth = labelStart === 0 ? 0 : Math.max(1, Math.round(labelStart / 4));

    const node: TreeNode = { label, children: [] };

    if (depth === 0) {
      roots.push(node);
      stack.length = 0;
    } else {
      while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) {
        stack.pop();
      }
      if (stack.length > 0) {
        const parent = stack[stack.length - 1]!.node;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    stack.push({ node, depth });
  }

  return roots;
}
