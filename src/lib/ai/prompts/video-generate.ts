export function buildVideoPrompt(params: {
  sceneDescription: string;
  motionScript: string;
  cameraDirection: string;
  duration?: number;
  characterDescriptions?: string;
}): string {
  // motionScript contains per-segment camera directions — no need to repeat overall cameraDirection.
  // Reformat segments onto separate lines for readability.
  const segments = params.motionScript
    .split(/(?=\d+[-–]\d+s[：:])/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    // Fallback: no segments found, output as-is
    return params.motionScript.trim();
  }

  return `${segments.join("\n")}\nCamera: ${params.cameraDirection}`;
}
