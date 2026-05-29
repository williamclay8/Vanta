import { useCallback, useState } from "react";

type ReleasePackageExportState = {
  downloadJsonFilename: string;
  downloadSummaryFilename: string;
  exportJson: string;
  exportText: string;
};

export type UnshieldReleasePackageExportStatus =
  | "idle"
  | "summary-copy"
  | "json-copy"
  | "summary-download"
  | "json-download"
  | "failed";

export function useUnshieldReleasePackageExport(
  privateCoreReleasePackageState: ReleasePackageExportState | null | undefined,
) {
  const [releasePackageExportStatus, setReleasePackageExportStatus] =
    useState<UnshieldReleasePackageExportStatus>("idle");

  const copyReleasePackageExport = useCallback(
    async (mode: "summary" | "json") => {
      if (!privateCoreReleasePackageState) {
        setReleasePackageExportStatus("failed");
        return;
      }

      try {
        await navigator.clipboard.writeText(
          mode === "json"
            ? privateCoreReleasePackageState.exportJson
            : privateCoreReleasePackageState.exportText,
        );
        setReleasePackageExportStatus(mode === "json" ? "json-copy" : "summary-copy");
      } catch {
        setReleasePackageExportStatus("failed");
      }
    },
    [privateCoreReleasePackageState],
  );

  const downloadReleasePackageExport = useCallback(
    (mode: "summary" | "json") => {
      if (!privateCoreReleasePackageState) {
        setReleasePackageExportStatus("failed");
        return;
      }

      const blob = new Blob(
        [
          mode === "json"
            ? privateCoreReleasePackageState.exportJson
            : privateCoreReleasePackageState.exportText,
        ],
        {
          type: mode === "json" ? "application/json" : "text/plain;charset=utf-8",
        },
      );
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        mode === "json"
          ? privateCoreReleasePackageState.downloadJsonFilename
          : privateCoreReleasePackageState.downloadSummaryFilename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      setReleasePackageExportStatus(mode === "json" ? "json-download" : "summary-download");
    },
    [privateCoreReleasePackageState],
  );

  return {
    copyReleasePackageExport,
    downloadReleasePackageExport,
    releasePackageExportStatus,
  };
}
