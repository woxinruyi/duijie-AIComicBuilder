export function buildVideoPrompt(params: {
  sceneDescription: string;
  motionScript: string;
  cameraDirection: string;
}): string {
  return `Camera movement: ${params.cameraDirection}

Action: ${params.motionScript}

Scene: ${params.sceneDescription}

Generate a smooth, cinematic video transition from the first frame to the last frame.
The camera movement should be steady and natural.
Character movements should be fluid and match the action description.
Maintain consistent lighting, color grading, and visual style throughout.`;
}
