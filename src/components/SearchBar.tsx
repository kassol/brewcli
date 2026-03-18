import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useTheme } from "../hooks/useTheme.tsx";
import type { SearchResult } from "../brew/types.ts";
import { search } from "../brew/search.ts";

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
  width: number;
}

export function SearchBar({ onSelect, onClose, width }: SearchBarProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await search(term);
      setResults(res.slice(0, 20));
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (key.return && results[selectedIndex]) {
      onSelect(results[selectedIndex]);
      return;
    }
  });

  const boxWidth = Math.min(width - 4, 70);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      width={boxWidth}
      paddingX={2}
      paddingY={1}
    >
      <Box flexDirection="column">
        <Text color={colors.primary} bold>
          Search Packages
        </Text>
        <Text color={colors.muted}>Formulae and casks, 2+ characters</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={colors.accent} bold>
          Query:{" "}
        </Text>
        <TextInput value={query} onChange={handleChange} />
        {loading && <Text color={colors.muted}> searching...</Text>}
      </Box>

      {results.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {results.slice(0, 15).map((r, i) => (
            <Box key={`${r.type}-${r.name}`} justifyContent="space-between">
              <Text
                inverse={i === selectedIndex}
                color={
                  i === selectedIndex
                    ? undefined
                    : r.installed
                      ? colors.success
                      : colors.text
                }
              >
                {i === selectedIndex ? "> " : "  "}
                [{r.type === "formula" ? "F" : "C"}] {r.name}
              </Text>
              <Text
                inverse={i === selectedIndex}
                color={i === selectedIndex ? undefined : r.installed ? colors.success : colors.muted}
              >
                {r.installed ? "installed" : r.type}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {query.length > 0 && query.length < 2 && (
        <Box marginTop={1}>
          <Text color={colors.muted}>Keep typing to search...</Text>
        </Box>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <Box marginTop={1}>
          <Text color={colors.muted}>No packages matched your query</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={colors.muted}>
          [Enter] Open  [Esc] Close  [Up/Down] Move
        </Text>
      </Box>
    </Box>
  );
}
