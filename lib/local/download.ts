import { localExportFileName } from "./export-service";
import type { LocalExportEnvelope } from "./export-schema";

export interface LocalExportDownload {
  fileName: string;
  url: string;
  revoke: () => void;
}

export function createLocalExportDownload(
  envelope: LocalExportEnvelope,
): LocalExportDownload {
  const blob = exportBlob(envelope);
  const url = URL.createObjectURL(blob);
  return {
    fileName: localExportFileName(envelope),
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}

export function downloadLocalExportEnvelope(envelope: LocalExportEnvelope) {
  const download = createLocalExportDownload(envelope);
  const anchor = document.createElement("a");
  anchor.href = download.url;
  anchor.download = download.fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(download.revoke, 0);
}

function exportBlob(envelope: LocalExportEnvelope) {
  return new Blob([JSON.stringify(envelope, null, 2)], {
    type: "application/json",
  });
}
