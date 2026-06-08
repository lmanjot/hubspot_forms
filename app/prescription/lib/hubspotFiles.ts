const HUBSPOT_FILES_BASE = "https://api.hubapi.com/files/v3/files";

export async function uploadPdfToHubSpot(
  token: string,
  pdfBytes: Uint8Array,
  filename: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" });
  formData.append("file", blob, filename);
  formData.append("folderPath", "/prescriptions");
  formData.append(
    "options",
    JSON.stringify({
      access: "PRIVATE",
      overwrite: false,
      duplicateValidationStrategy: "NONE",
      duplicateValidationScope: "ENTIRE_PORTAL",
    })
  );

  const res = await fetch(HUBSPOT_FILES_BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `HubSpot file upload failed (${res.status}): ${JSON.stringify(json)}`
    );
  }

  const fileId = json?.id;
  if (typeof fileId !== "string" && typeof fileId !== "number") {
    throw new Error("HubSpot file upload returned no file id");
  }

  return String(fileId);
}

export async function getSignedFileUrl(
  token: string,
  fileId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${HUBSPOT_FILES_BASE}/${encodeURIComponent(fileId)}/signed-url`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.url === "string" ? json.url : null;
  } catch {
    return null;
  }
}
