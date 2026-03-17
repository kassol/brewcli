// Brew JSON v2 types

export interface FormulaInstallInfo {
  version: string;
  used_options: string[];
  built_as_bottle: boolean;
  poured_from_bottle: boolean;
  time: number;
  runtime_dependencies: RuntimeDep[];
  installed_as_dependency: boolean;
  installed_on_request: boolean;
}

export interface RuntimeDep {
  full_name: string;
  version: string;
  revision: number;
  pkg_version: string;
  declared_directly: boolean;
}

export interface FormulaInfo {
  name: string;
  full_name: string;
  tap: string;
  desc: string;
  license: string | null;
  homepage: string;
  versions: {
    stable: string;
    head: string | null;
    bottle: boolean;
  };
  revision: number;
  keg_only: boolean;
  build_dependencies: string[];
  dependencies: string[];
  test_dependencies: string[];
  recommended_dependencies: string[];
  optional_dependencies: string[];
  uses_from_macos: (string | Record<string, string>)[];
  conflicts_with: string[];
  pinned: boolean;
  outdated: boolean;
  deprecated: boolean;
  disabled: boolean;
  installed: FormulaInstallInfo[];
  linked_keg: string | null;
  service: unknown;
}

export interface CaskInfo {
  token: string;
  full_token: string;
  tap: string;
  name: string[];
  desc: string;
  homepage: string;
  url: string;
  version: string;
  installed: string | null;
  outdated: boolean;
  auto_updates: boolean | null;
  deprecated: boolean;
  disabled: boolean;
  caveats: string | null;
  depends_on: Record<string, unknown>;
  conflicts_with: unknown;
}

export interface BrewInfoV2 {
  formulae: FormulaInfo[];
  casks: CaskInfo[];
}

export interface ServiceInfo {
  name: string;
  status: string;
  user: string | null;
  file: string | null;
  exit_code: number | null;
  pid: number | null;
}

export interface OutdatedFormula {
  name: string;
  installed_versions: string[];
  current_version: string;
  pinned: boolean;
  pinned_version: string | null;
}

export interface OutdatedCask {
  name: string;
  installed_versions: string;
  current_version: string;
}

export interface OutdatedInfo {
  formulae: OutdatedFormula[];
  casks: OutdatedCask[];
}

export interface SearchResult {
  name: string;
  type: "formula" | "cask";
  desc?: string;
  version?: string;
  installed: boolean;
}
