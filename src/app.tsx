import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { MIN_TERMINAL_HEIGHT, MIN_TERMINAL_WIDTH } from "./theme.ts";
import { ThemeProvider, useTheme } from "./hooks/useTheme.tsx";
import { useTerminalSize } from "./hooks/useTerminalSize.ts";
import { invalidateCache } from "./hooks/useAsync.ts";
import { Sidebar, type SidebarSection } from "./components/Sidebar.tsx";
import { StatusBar, type KeyHint } from "./components/StatusBar.tsx";
import { Toast, toastDuration, type ToastMessage } from "./components/Toast.tsx";
import { SearchBar } from "./components/SearchBar.tsx";
import { ConfirmDialog } from "./components/ConfirmDialog.tsx";
import { HelpOverlay } from "./components/HelpOverlay.tsx";
import { InputDialog } from "./components/InputDialog.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Formulae, type FormulaeAction } from "./pages/Formulae.tsx";
import { Casks, type CaskAction } from "./pages/Casks.tsx";
import { Detail, type DetailAction } from "./pages/Detail.tsx";
import { Services, type ServiceAction } from "./pages/Services.tsx";
import { Taps, type TapAction } from "./pages/Taps.tsx";
import { Cleanup } from "./pages/Cleanup.tsx";
import { Outdated, type OutdatedAction } from "./pages/Outdated.tsx";
import * as brew from "./brew/index.ts";
import type { SearchResult } from "./brew/types.ts";

type Page = "dashboard" | "formulae" | "casks" | "outdated" | "services" | "taps" | "cleanup";
type Mode = "normal" | "search" | "detail" | "confirm" | "help" | "input";
type Focus = "sidebar" | "main";

interface ConfirmState {
  title: string;
  message: string;
  destructive: boolean;
  action: () => Promise<void>;
}

function getPageHints(page: Page): KeyHint[] {
  switch (page) {
    case "dashboard":
      return [
        { key: "?", label: "Help" },
        { key: "t", label: "Theme" },
        { key: "q", label: "Quit" },
      ];
    case "formulae":
      return [
        { key: "d", label: "Uninstall" },
        { key: "Enter", label: "Detail" },
        { key: "u", label: "Upgrade" },
        { key: "p", label: "Pin" },
        { key: "v", label: "View" },
        { key: "/", label: "Filter" },
      ];
    case "casks":
      return [
        { key: "d", label: "Uninstall" },
        { key: "Enter", label: "Detail" },
        { key: "u", label: "Upgrade" },
        { key: "/", label: "Filter" },
      ];
    case "outdated":
      return [
        { key: "u", label: "Upgrade" },
        { key: "U", label: "Upgrade All" },
        { key: "Enter", label: "Detail" },
        { key: "d", label: "Uninstall" },
      ];
    case "services":
      return [
        { key: "s", label: "Start/Stop" },
        { key: "R", label: "Restart" },
        { key: "r", label: "Refresh" },
      ];
    case "taps":
      return [
        { key: "d", label: "Remove" },
        { key: "a", label: "Add" },
        { key: "r", label: "Refresh" },
      ];
    case "cleanup":
      return [
        { key: "p", label: "Preview" },
        { key: "c", label: "Cleanup" },
        { key: "a", label: "AutoRM Preview" },
        { key: "A", label: "AutoRM" },
        { key: "D", label: "Doctor" },
      ];
    default:
      return [];
  }
}

const sidebarHints: KeyHint[] = [
  { key: "j/k", label: "Navigate" },
  { key: "Enter", label: "Select" },
  { key: "Tab", label: "Main" },
];

const modeHints: Record<string, KeyHint[]> = {
  confirm: [
    { key: "y/Enter", label: "Confirm" },
    { key: "n/Esc", label: "Cancel" },
  ],
  search: [
    { key: "Enter", label: "Select" },
    { key: "Esc", label: "Close" },
    { key: "Up/Down", label: "Navigate" },
  ],
  help: [
    { key: "Esc", label: "Close" },
    { key: "?", label: "Close" },
  ],
  input: [
    { key: "Enter", label: "Submit" },
    { key: "Esc", label: "Cancel" },
  ],
};

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { colors, colorScheme, toggleTheme } = useTheme();

  const sidebarSections: SidebarSection[] = useMemo(
    () => [
      {
        header: "Packages",
        items: [
          { key: "dashboard", label: "Dashboard" },
          { key: "formulae", label: "Formulae" },
          { key: "casks", label: "Casks" },
        ],
      },
      {
        header: "Updates",
        items: [
          { key: "outdated", label: "Outdated", badgeColor: colors.warning },
        ],
      },
      {
        header: "System",
        items: [
          { key: "services", label: "Services" },
          { key: "taps", label: "Taps" },
          { key: "cleanup", label: "Cleanup" },
        ],
      },
    ],
    [colors],
  );
  const { exit } = useApp();
  const { width, height } = useTerminalSize();

  const [page, setPage] = useState<Page>("dashboard");
  const [mode, setMode] = useState<Mode>("normal");
  const [focus, setFocus] = useState<Focus>("sidebar");
  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastIdRef = React.useRef(0);
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // Detail state
  const [detailName, setDetailName] = useState("");
  const [detailType, setDetailType] = useState<"formula" | "cask">("formula");

  // Input dialog state
  const [inputConfig, setInputConfig] = useState<{
    title: string;
    hint: string;
    placeholder?: string;
    onSubmit: (value: string) => void;
  } | null>(null);

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), toastDuration(toast.type));
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const notify = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, text: msg, type });
  }, []);

  const showConfirm = useCallback(
    (title: string, message: string, action: () => Promise<void>, destructive = false) => {
      setConfirmState({ title, message, destructive, action });
      setMode("confirm");
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmState) return;
    setMode("normal");
    setLoading(true);
    try {
      await confirmState.action();
      invalidateCache(); // Force all mounted hooks to re-fetch fresh data
      notify(`${confirmState.title} completed`, "success");
    } catch (e) {
      notify(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setLoading(false);
      setConfirmState(null);
    }
  }, [confirmState, notify]);

  const handleCancel = useCallback(() => {
    setMode("normal");
    setConfirmState(null);
  }, []);

  const openDetail = useCallback((name: string, type: "formula" | "cask") => {
    setDetailName(name);
    setDetailType(type);
    setMode("detail");
  }, []);

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      setMode("normal");
      openDetail(result.name, result.type);
    },
    [openDetail],
  );

  // Formulae actions
  const handleFormulaAction = useCallback(
    (action: FormulaeAction) => {
      switch (action.type) {
        case "uninstall":
          showConfirm(
            "Uninstall Formula",
            `Uninstall ${action.name}? This will remove the package and may leave orphaned dependencies.`,
            () => brew.formula.uninstall(action.name).then(() => {}),
            true,
          );
          break;
        case "upgrade":
          showConfirm(
            "Upgrade Formula",
            `Upgrade ${action.name} to the latest version?`,
            () => brew.formula.upgrade(action.name).then(() => {}),
          );
          break;
        case "upgrade_all":
          showConfirm(
            "Upgrade All Formulae",
            "Upgrade all outdated formulae to their latest versions?",
            () => brew.formula.upgrade().then(() => {}),
          );
          break;
        case "pin":
          brew.formula.pin(action.name).then(() => { invalidateCache(); notify(`Pinned ${action.name}`, "success"); });
          break;
        case "unpin":
          brew.formula.unpin(action.name).then(() => { invalidateCache(); notify(`Unpinned ${action.name}`, "success"); });
          break;
      }
    },
    [showConfirm, notify],
  );

  // Cask actions
  const handleCaskAction = useCallback(
    (action: CaskAction) => {
      switch (action.type) {
        case "uninstall_cask":
          showConfirm(
            "Uninstall Cask",
            `Uninstall ${action.name}? The application will be removed.`,
            () => brew.cask.uninstall(action.name).then(() => {}),
            true,
          );
          break;
        case "upgrade_cask":
          showConfirm(
            "Upgrade Cask",
            `Upgrade ${action.name} to the latest version?`,
            () => brew.cask.upgrade(action.name).then(() => {}),
          );
          break;
        case "upgrade_all_casks":
          showConfirm(
            "Upgrade All Casks",
            "Upgrade all outdated casks?",
            () => brew.cask.upgrade().then(() => {}),
          );
          break;
      }
    },
    [showConfirm],
  );

  // Service actions
  const handleServiceAction = useCallback(
    (action: ServiceAction) => {
      switch (action.type) {
        case "start_service":
          showConfirm("Start Service", `Start ${action.name}?`,
            () => brew.service.start(action.name).then(() => {}));
          break;
        case "stop_service":
          showConfirm("Stop Service", `Stop ${action.name}?`,
            () => brew.service.stop(action.name).then(() => {}));
          break;
        case "restart_service":
          showConfirm("Restart Service", `Restart ${action.name}?`,
            () => brew.service.restart(action.name).then(() => {}));
          break;
      }
    },
    [showConfirm],
  );

  // Tap actions
  const handleTapAction = useCallback(
    (action: TapAction) => {
      if (action.type === "remove_tap") {
        showConfirm("Remove Tap", `Remove ${action.name}? Formulae from this tap will become unavailable.`,
          () => brew.tap.untap(action.name).then(() => {}), true);
      }
      if (action.type === "add_tap") {
        setInputConfig({
          title: "Add Tap",
          hint: "Enter tap name, e.g. kassol/tap",
          placeholder: "user/repo",
          onSubmit: (value: string) => {
            setMode("normal");
            setInputConfig(null);
            showConfirm(
              "Add Tap",
              `Tap ${value}? This will clone the repository.`,
              () => brew.tap.tap(value).then(() => {}),
            );
          },
        });
        setMode("input");
      }
    },
    [showConfirm],
  );

  // Outdated actions
  const handleOutdatedAction = useCallback(
    (action: OutdatedAction) => {
      switch (action.type) {
        case "upgrade":
          showConfirm(
            "Upgrade Package",
            `Upgrade ${action.name} to the latest version?`,
            () =>
              action.pkgType === "cask"
                ? brew.cask.upgrade(action.name).then(() => {})
                : brew.formula.upgrade(action.name).then(() => {}),
          );
          break;
        case "upgrade_all":
          showConfirm(
            "Upgrade All",
            "Upgrade all outdated packages (formulae + casks)?",
            async () => {
              await brew.formula.upgrade();
              await brew.cask.upgrade();
            },
          );
          break;
      }
    },
    [showConfirm],
  );

  // Detail actions
  const handleDetailAction = useCallback(
    (action: DetailAction) => {
      switch (action.type) {
        case "install":
          showConfirm("Install Package", `Install ${action.name}?`,
            () => action.pkgType === "cask"
              ? brew.cask.install(action.name).then(() => {})
              : brew.formula.install(action.name).then(() => {}));
          break;
        case "uninstall":
          showConfirm("Uninstall Package", `Uninstall ${action.name}?`,
            () => action.pkgType === "cask"
              ? brew.cask.uninstall(action.name).then(() => {})
              : brew.formula.uninstall(action.name).then(() => {}), true);
          break;
        case "upgrade":
          showConfirm("Upgrade Package", `Upgrade ${action.name}?`,
            () => action.pkgType === "cask"
              ? brew.cask.upgrade(action.name).then(() => {})
              : brew.formula.upgrade(action.name).then(() => {}));
          break;
        case "pin":
          brew.formula.pin(action.name).then(() => { invalidateCache(); notify(`Pinned ${action.name}`, "success"); });
          break;
        case "unpin":
          brew.formula.unpin(action.name).then(() => { invalidateCache(); notify(`Unpinned ${action.name}`, "success"); });
          break;
      }
    },
    [showConfirm, notify],
  );

  // Global key bindings
  useInput(
    (input, key) => {
      if (input === "q") {
        exit();
        return;
      }
      if (input === "?") {
        setMode("help");
        return;
      }
      if (input === "/") {
        setMode("search");
        return;
      }
      if (key.tab) {
        setFocus((f) => (f === "sidebar" ? "main" : "sidebar"));
        return;
      }
      if (input === "t") {
        toggleTheme();
        return;
      }
      if (input === "h") {
        setFocus("sidebar");
        return;
      }
      if (input === "l" && focus === "sidebar") {
        setFocus("main");
        return;
      }
    },
    { isActive: mode === "normal" },
  );

  const handlePageSelect = useCallback((key: string) => {
    setPage(key as Page);
    setFocus("main");
  }, []);

  const mainFocused = focus === "main" && mode === "normal";

  const hints = useMemo<KeyHint[]>(() => {
    if (mode !== "normal" && mode !== "detail") {
      return modeHints[mode] ?? [];
    }
    if (focus === "sidebar") {
      return sidebarHints;
    }
    return getPageHints(page);
  }, [mode, focus, page]);

  if (width < MIN_TERMINAL_WIDTH || height < MIN_TERMINAL_HEIGHT) {
    return (
      <Box alignItems="center" justifyContent="center" width={width} height={height}>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={colors.warning}
          paddingX={2}
          paddingY={1}
          width={58}
        >
          <Text color={colors.warning} bold>
            Terminal too small
          </Text>
          <Text color={colors.subtext}>
            Resize to at least {MIN_TERMINAL_WIDTH}x{MIN_TERMINAL_HEIGHT} to use brewcli comfortably.
          </Text>
          <Box marginTop={1}>
            <Text color={colors.muted}>Current size: {width}x{height}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard isFocused={mainFocused} />;
      case "formulae":
        return (
          <Formulae
            isFocused={mainFocused}
            onViewDetail={(name) => openDetail(name, "formula")}
            onAction={handleFormulaAction}
          />
        );
      case "casks":
        return (
          <Casks
            isFocused={mainFocused}
            onViewDetail={(name) => openDetail(name, "cask")}
            onAction={handleCaskAction}
          />
        );
      case "outdated":
        return (
          <Outdated
            isFocused={mainFocused}
            onViewDetail={(name, type) => openDetail(name, type)}
            onAction={handleOutdatedAction}
          />
        );
      case "services":
        return <Services isFocused={mainFocused} onAction={handleServiceAction} />;
      case "taps":
        return <Taps isFocused={mainFocused} onAction={handleTapAction} />;
      case "cleanup":
        return <Cleanup isFocused={mainFocused} onNotify={notify} />;
      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Main layout */}
      <Box flexDirection="row" flexGrow={1}>
        <Sidebar
          sections={sidebarSections}
          activeKey={page}
          selectedIndex={sidebarIndex}
          onSelect={handlePageSelect}
          onChangeIndex={setSidebarIndex}
          isFocused={focus === "sidebar" && mode === "normal"}
        />

        <Box flexDirection="column" flexGrow={1}>
          {mode === "detail" ? (
            <Detail
              name={detailName}
              type={detailType}
              onClose={() => setMode("normal")}
              onAction={handleDetailAction}
            />
          ) : (
            renderPage()
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        page={page}
        mode={mode}
        hints={hints}
        loading={loading}
      />

      {/* Toast notification */}
      <Toast message={toast} terminalWidth={width} />

      {/* Overlays */}
      {mode === "search" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={width}
          height={height}
        >
          <SearchBar
            onSelect={handleSearchSelect}
            onClose={() => setMode("normal")}
            width={width}
          />
        </Box>
      )}

      {mode === "confirm" && confirmState && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={width}
          height={height}
        >
          <ConfirmDialog
            title={confirmState.title}
            message={confirmState.message}
            destructive={confirmState.destructive}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </Box>
      )}

      {mode === "help" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={width}
          height={height}
        >
          <HelpOverlay onClose={() => setMode("normal")} />
        </Box>
      )}

      {mode === "input" && inputConfig && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={width}
          height={height}
        >
          <InputDialog
            title={inputConfig.title}
            hint={inputConfig.hint}
            placeholder={inputConfig.placeholder}
            onSubmit={inputConfig.onSubmit}
            onCancel={() => { setMode("normal"); setInputConfig(null); }}
          />
        </Box>
      )}
    </Box>
  );
}
