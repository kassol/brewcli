import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme.ts";
import { useAsync } from "../hooks/useAsync.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";
import { Tree, parseDepsTree, type TreeNode } from "../components/Tree.tsx";
import { Loading, ErrorDisplay } from "../components/Loading.tsx";
import * as brew from "../brew/index.ts";
import type { FormulaInfo, CaskInfo } from "../brew/types.ts";

type DetailTab = "info" | "deps" | "uses";

interface DetailProps {
  name: string;
  type: "formula" | "cask";
  onClose: () => void;
  onAction: (action: DetailAction) => void;
}

export type DetailAction =
  | { type: "install"; name: string; pkgType: "formula" | "cask" }
  | { type: "uninstall"; name: string; pkgType: "formula" | "cask" }
  | { type: "upgrade"; name: string; pkgType: "formula" | "cask" }
  | { type: "pin"; name: string }
  | { type: "unpin"; name: string };

export function Detail({ name, type, onClose, onAction }: DetailProps) {
  const [tab, setTab] = useState<DetailTab>("info");
  const [treeIndex, setTreeIndex] = useState(0);
  const { height, width } = useTerminalSize();

  const { data: formulaInfo, loading: formulaLoading, error: formulaError } =
    useAsync(
      `detail:formula:${name}`,
      () => brew.formula.info(name),
      { enabled: type === "formula", ttl: 60_000 },
    );

  const { data: caskInfo, loading: caskLoading, error: caskError } =
    useAsync(
      `detail:cask:${name}`,
      () => brew.cask.info(name),
      { enabled: type === "cask", ttl: 60_000 },
    );

  const { data: depsTree } = useAsync(
    `detail:deps:${name}`,
    () => brew.formula.depsTree(name),
    { enabled: type === "formula" && tab === "deps", ttl: 120_000 },
  );

  const { data: usedBy } = useAsync(
    `detail:uses:${name}`,
    () => brew.formula.uses(name),
    { enabled: type === "formula" && tab === "uses", ttl: 120_000 },
  );

  const treeData: TreeNode[] =
    tab === "deps" && depsTree
      ? parseDepsTree(depsTree)
      : tab === "uses" && usedBy
        ? usedBy.map((u) => ({ label: u }))
        : [];

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.tab || input === "l") {
      const tabs: DetailTab[] = ["info", "deps", "uses"];
      const idx = tabs.indexOf(tab);
      setTab(tabs[(idx + 1) % tabs.length]!);
      setTreeIndex(0);
      return;
    }
    if (key.shift && key.tab) {
      const tabs: DetailTab[] = ["info", "deps", "uses"];
      const idx = tabs.indexOf(tab);
      setTab(tabs[(idx - 1 + tabs.length) % tabs.length]!);
      setTreeIndex(0);
      return;
    }
    if (input === "i") {
      onAction({ type: "install", name, pkgType: type });
      return;
    }
    if (input === "d") {
      onAction({ type: "uninstall", name, pkgType: type });
      return;
    }
    if (input === "u") {
      onAction({ type: "upgrade", name, pkgType: type });
      return;
    }
    if (input === "p" && type === "formula" && formulaInfo) {
      onAction({
        type: formulaInfo.pinned ? "unpin" : "pin",
        name,
      });
      return;
    }
  });

  const loading = formulaLoading || caskLoading;
  const error = formulaError || caskError;

  if (loading) return <Loading message={`Loading ${name}...`} />;
  if (error) return <ErrorDisplay message={error} />;

  const renderInfo = () => {
    if (type === "formula" && formulaInfo) {
      return <FormulaDetail info={formulaInfo} />;
    }
    if (type === "cask" && caskInfo) {
      return <CaskDetail info={caskInfo} />;
    }
    return null;
  };

  const tabs: { key: DetailTab; label: string }[] =
    type === "formula"
      ? [
          { key: "info", label: "Info" },
          { key: "deps", label: "Dependencies" },
          { key: "uses", label: "Used By" },
        ]
      : [{ key: "info", label: "Info" }];

  const contentHeight = height - 8;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      flexGrow={1}
      paddingX={1}
    >
      {/* Title */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={colors.primary}>
          {name} ({type})
        </Text>
        <Text color={colors.muted}>[Esc] Close  [Tab] Switch tab</Text>
      </Box>

      {/* Tabs */}
      <Box gap={2} marginBottom={1}>
        {tabs.map((t) => (
          <Text
            key={t.key}
            bold={tab === t.key}
            color={tab === t.key ? colors.primary : colors.muted}
            inverse={tab === t.key}
          >
            {" "}
            {t.label}{" "}
          </Text>
        ))}
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1}>
        {tab === "info" && renderInfo()}
        {tab === "deps" && (
          <Tree
            data={treeData}
            isFocused={true}
            height={contentHeight}
            selectedIndex={treeIndex}
            onChangeIndex={setTreeIndex}
          />
        )}
        {tab === "uses" && (
          <Box flexDirection="column">
            {usedBy && usedBy.length > 0 ? (
              usedBy.map((u) => (
                <Text key={u} color={colors.text}>
                  {" "}
                  * {u}
                </Text>
              ))
            ) : (
              <Text color={colors.muted}>
                No installed packages depend on {name}
              </Text>
            )}
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box marginTop={1} gap={2}>
        <Text color={colors.muted}>
          [i] Install  [d] Uninstall  [u] Upgrade
          {type === "formula" ? "  [p] Pin/Unpin" : ""}
        </Text>
      </Box>
    </Box>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Box width={18}>
        <Text color={colors.subtext}>{label}:</Text>
      </Box>
      <Text color={color ?? colors.text}>{value}</Text>
    </Box>
  );
}

function FormulaDetail({ info }: { info: FormulaInfo }) {
  const installed = info.installed[0];
  const installedDate = installed
    ? new Date(installed.time * 1000).toLocaleDateString()
    : "-";

  return (
    <Box flexDirection="column" gap={0}>
      <InfoRow label="Description" value={info.desc || "-"} />
      <InfoRow label="Homepage" value={info.homepage} color={colors.accent} />
      <InfoRow label="Version" value={info.versions.stable ?? "-"} />
      <InfoRow label="License" value={info.license ?? "-"} />
      <InfoRow label="Tap" value={info.tap ?? "-"} />
      <InfoRow label="Installed" value={installedDate} />
      <InfoRow
        label="Installed by"
        value={
          installed?.installed_on_request ? "request" : "dependency"
        }
      />
      <InfoRow
        label="Pinned"
        value={info.pinned ? "Yes" : "No"}
        color={info.pinned ? colors.pink : undefined}
      />
      <InfoRow
        label="Outdated"
        value={info.outdated ? "Yes" : "No"}
        color={info.outdated ? colors.warning : undefined}
      />
      <InfoRow
        label="Dependencies"
        value={
          info.dependencies.length > 0
            ? info.dependencies.join(", ")
            : "none"
        }
      />
      <InfoRow
        label="Build deps"
        value={
          info.build_dependencies.length > 0
            ? info.build_dependencies.join(", ")
            : "none"
        }
      />
      {info.keg_only && (
        <InfoRow label="Keg-only" value="Yes" color={colors.warning} />
      )}
      {info.deprecated && (
        <InfoRow label="Deprecated" value="Yes" color={colors.error} />
      )}
    </Box>
  );
}

function CaskDetail({ info }: { info: CaskInfo }) {
  return (
    <Box flexDirection="column" gap={0}>
      <InfoRow label="Name" value={info.name.join(", ") || info.token} />
      <InfoRow label="Description" value={info.desc || "-"} />
      <InfoRow label="Homepage" value={info.homepage} color={colors.accent} />
      <InfoRow label="Version" value={info.version ?? "-"} />
      <InfoRow label="Tap" value={info.tap ?? "-"} />
      <InfoRow
        label="Installed"
        value={info.installed ?? "No"}
      />
      <InfoRow
        label="Auto-updates"
        value={info.auto_updates ? "Yes" : "No"}
      />
      <InfoRow
        label="Outdated"
        value={info.outdated ? "Yes" : "No"}
        color={info.outdated ? colors.warning : undefined}
      />
      {info.caveats && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color={colors.warning}>
            Caveats:
          </Text>
          <Text color={colors.subtext}>{info.caveats}</Text>
        </Box>
      )}
    </Box>
  );
}
