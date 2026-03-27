// ─────────────────────────────────────────────────────────
// Prompt Registry — Slot Decomposition
// Decomposes all 12 prompt templates into editable slots.
// ─────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────

export interface PromptSlot {
  /** Unique key within a prompt definition */
  key: string;
  /** i18n key for the human-readable slot name */
  nameKey: string;
  /** i18n key for the slot description */
  descriptionKey: string;
  /** The original text content of this slot */
  defaultContent: string;
  /** Whether users can customise this slot */
  editable: boolean;
}

export type PromptCategory =
  | "script"
  | "character"
  | "shot"
  | "frame"
  | "video";

export interface PromptDefinition {
  /** Machine-readable key, e.g. "script_generate" */
  key: string;
  /** i18n key for the prompt name */
  nameKey: string;
  /** i18n key for the prompt description */
  descriptionKey: string;
  /** Grouping category */
  category: PromptCategory;
  /** Ordered list of slots that compose this prompt */
  slots: PromptSlot[];
  /**
   * Reassemble the full system prompt from (possibly customised) slot contents.
   * @param slotContents  Map of slot key → text content. Missing keys fall back to defaults.
   * @param params        Dynamic parameters required by some prompts (e.g. maxDuration for shot_split).
   */
  buildFullPrompt: (
    slotContents: Record<string, string>,
    params?: Record<string, unknown>
  ) => string;
}

// ── Helpers ──────────────────────────────────────────────

function slot(
  key: string,
  defaultContent: string,
  editable: boolean
): PromptSlot {
  return {
    key,
    nameKey: `promptTemplates.slots.${camel(key)}`,
    descriptionKey: `promptTemplates.slots.${camel(key)}Desc`,
    defaultContent,
    editable,
  };
}

function camel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function resolve(
  slotContents: Record<string, string>,
  slots: PromptSlot[],
  key: string
): string {
  if (key in slotContents) return slotContents[key];
  const s = slots.find((sl) => sl.key === key);
  return s?.defaultContent ?? "";
}

// ── Prompt Definitions ──────────────────────────────────

// ─── 1. script_generate ─────────────────────────────────

const SCRIPT_GENERATE_ROLE_DEFINITION = `You are an award-winning screenwriter with expertise in visual storytelling for short-form animated content. Your scripts are renowned for cinematic pacing, vivid imagery, and emotionally resonant dialogue.

Your task: transform a brief creative idea into a polished, production-ready screenplay optimized for AI-generated animation (each scene = one 5–15 second animated shot).`;

const SCRIPT_GENERATE_LANGUAGE_RULES = `CRITICAL LANGUAGE RULE: You MUST write the entire screenplay in the SAME LANGUAGE as the user's input. If the user writes in Chinese, output the screenplay entirely in Chinese. If in English, output in English. This applies to ALL sections below.`;

const SCRIPT_GENERATE_OUTPUT_FORMAT = `Output format — the screenplay MUST contain these sections IN ORDER:`;

const SCRIPT_GENERATE_VISUAL_STYLE_SECTION = `=== 1. VISUAL STYLE ===
Declare the overall art direction at the very top. This section defines the visual identity for the entire project. Include:
- Art style: realistic live-action / photorealistic CG / anime / 2D cartoon / watercolor / pixel art / etc. (respect user's preference if specified, e.g., "真人" = realistic live-action style)
- Color palette: overall tone (warm, cold, desaturated, vibrant), dominant colors
- Era & aesthetic: modern, retro, futuristic, fantasy medieval, etc.
- Mood & atmosphere: cinematic noir, lighthearted comedy, epic adventure, etc.`;

const SCRIPT_GENERATE_CHARACTER_SECTION = `=== 2. CHARACTERS ===
For EVERY named character, provide a detailed visual description block:
  CHARACTER_NAME
  - Appearance: gender, age, height/build, face features, skin tone, hair (color, style, length)
  - Outfit: specific clothing with materials and colors (e.g., "worn brown leather jacket, faded indigo jeans, white sneakers")
  - Distinctive features: scars, glasses, tattoos, accessories, etc.
  - Personality in motion: how they carry themselves (posture, gait, habitual gestures)`;

const SCRIPT_GENERATE_SCENE_SECTION = `=== 3. SCENES ===
Professional screenplay notation:
- SCENE headers: "SCENE [N] — [INT/EXT]. [LOCATION] — [TIME OF DAY]"
- Parenthetical stage directions for each scene describing:
  • Camera framing (close-up, wide shot, over-the-shoulder, etc.)
  • Character blocking and movement
  • Key environmental details (lighting, weather, props, architecture, colors)
  • Emotional beat of the scene
- Character dialogue:
  CHARACTER NAME
  (delivery direction)
  "Dialogue text"`;

const SCRIPT_GENERATE_SCREENWRITING_PRINCIPLES = `Screenwriting principles:
- Open with a HOOK — a striking visual or intriguing moment that demands attention
- Every scene must serve the story: advance plot, reveal character, or build tension
- "Show, don't tell" — favor visual storytelling over exposition
- Dialogue should feel natural; subtext > on-the-nose statements
- Build a clear three-act structure: SETUP → CONFRONTATION → RESOLUTION
- End with emotional payoff — surprise, catharsis, or a powerful image
- Scale the number of scenes to match the target duration specified in the idea. If the idea specifies a target duration (e.g. "目标时长：10分钟"), calculate scenes accordingly: ~1 scene per 30-60 seconds of screen time. A 10-minute episode needs 10-20 scenes, NOT 4-8.
- Each scene description must be visually specific enough for an AI image generator to produce a frame (describe colors, spatial relationships, lighting quality)
- Scene descriptions should be consistent with the declared VISUAL STYLE (e.g., if "realistic", describe photographic details; if "anime", describe anime-specific aesthetics)

Do NOT output JSON. Do NOT use markdown code fences. Output plain screenplay text only.`;

const scriptGenerateDef: PromptDefinition = {
  key: "script_generate",
  nameKey: "promptTemplates.prompts.scriptGenerate",
  descriptionKey: "promptTemplates.prompts.scriptGenerateDesc",
  category: "script",
  slots: [
    slot("role_definition", SCRIPT_GENERATE_ROLE_DEFINITION, true),
    slot("language_rules", SCRIPT_GENERATE_LANGUAGE_RULES, false),
    slot("output_format", SCRIPT_GENERATE_OUTPUT_FORMAT, false),
    slot("visual_style_section", SCRIPT_GENERATE_VISUAL_STYLE_SECTION, true),
    slot("character_section", SCRIPT_GENERATE_CHARACTER_SECTION, true),
    slot("scene_section", SCRIPT_GENERATE_SCENE_SECTION, true),
    slot(
      "screenwriting_principles",
      SCRIPT_GENERATE_SCREENWRITING_PRINCIPLES,
      true
    ),
  ],
  buildFullPrompt(sc) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return [
      r("role_definition"),
      "",
      r("language_rules"),
      "",
      r("output_format"),
      "",
      r("visual_style_section"),
      "",
      r("character_section"),
      "",
      r("scene_section"),
      "",
      r("screenwriting_principles"),
    ].join("\n");
  },
};

// ─── 2. script_parse ────────────────────────────────────

const SCRIPT_PARSE_ROLE_DEFINITION = `You are a senior script supervisor and story editor specializing in adapting written narratives into structured screenplays for animated short films.

Your task: analyze a user's raw story, prose, or unstructured script and restructure it into a precisely formatted screenplay JSON optimized for downstream AI animation pipeline (image generation → video generation).`;

const SCRIPT_PARSE_OUTPUT_FORMAT = `Output a single JSON object:
{
  "title": "Compelling, evocative title",
  "synopsis": "A 1-2 sentence logline capturing the core conflict and stakes",
  "scenes": [
    {
      "sceneNumber": 1,
      "setting": "Specific location + time (e.g., 'Dimly lit basement workshop — late night')",
      "description": "Detailed visual description: character positions, actions, key props, lighting quality (warm/cold/dramatic), atmosphere, color palette. Written as a shot direction an animator can follow.",
      "mood": "Precise emotional tone (e.g., 'tense anticipation with underlying warmth')",
      "dialogues": [
        {
          "character": "CHARACTER_NAME (must match exact name used elsewhere)",
          "text": "Natural dialogue line",
          "emotion": "Specific delivery direction (e.g., 'whispering urgently, eyes darting')"
        }
      ]
    }
  ]
}`;

const SCRIPT_PARSE_PARSING_RULES = `Story editing principles:
- Preserve the author's original intent, tone, and voice
- Identify and strengthen the narrative arc: INCITING INCIDENT → RISING ACTION → CLIMAX → DENOUEMENT
- Each scene = one continuous 5–15 second animated shot; split long passages into multiple scenes
- Scene descriptions must be visually concrete: specify spatial relationships, character postures, lighting direction, dominant colors
- Dialogue emotions should describe physical expression, not just named feelings
- Maintain strict character name consistency across all scenes
- If the source is vague, infer reasonable visual details that serve the story`;

const SCRIPT_PARSE_LANGUAGE_RULES = `CRITICAL LANGUAGE RULE: All text content in the JSON (title, synopsis, setting, description, mood, dialogue text, emotion) MUST be in the SAME LANGUAGE as the source text. If the source is in Chinese, all output text must be in Chinese. Do NOT translate to English.

Respond ONLY with valid JSON. No markdown fences. No commentary.`;

const scriptParseDef: PromptDefinition = {
  key: "script_parse",
  nameKey: "promptTemplates.prompts.scriptParse",
  descriptionKey: "promptTemplates.prompts.scriptParseDesc",
  category: "script",
  slots: [
    slot("role_definition", SCRIPT_PARSE_ROLE_DEFINITION, true),
    slot("output_format", SCRIPT_PARSE_OUTPUT_FORMAT, false),
    slot("parsing_rules", SCRIPT_PARSE_PARSING_RULES, true),
    slot("language_rules", SCRIPT_PARSE_LANGUAGE_RULES, false),
  ],
  buildFullPrompt(sc) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return [
      r("role_definition"),
      "",
      r("output_format"),
      "",
      r("parsing_rules"),
      "",
      r("language_rules"),
    ].join("\n");
  },
};

// ─── 3. script_split ────────────────────────────────────

const SCRIPT_SPLIT_ROLE_DEFINITION = `You are an award-winning screenwriter specializing in episodic animated content. Your task is to take source material (which may be a novel, article, report, story, or any text) and adapt it into episodic screenplay format, split by target duration.`;

const SCRIPT_SPLIT_SPLITTING_RULES = `RULES:
1. Each episode MUST be a self-contained narrative unit with a clear beginning, rising action, and cliffhanger or resolution.
2. Split at natural story boundaries — scene changes, time jumps, perspective shifts, or dramatic turning points.
3. Generate a concise title, a 1-2 sentence description, and 3-5 comma-separated keywords for each episode.
4. If the source material is non-narrative (e.g. a report, manual, article), creatively adapt it into a story — use characters, dramatization, and visual metaphors to make the content engaging.`;

const SCRIPT_SPLIT_IDEA_REQUIREMENTS = `5. The "idea" field will be fed into a SEPARATE AI screenplay generator as its ONLY input. It MUST be extremely detailed:
   - Start with a list of characters appearing in this episode and their roles
   - COPY verbatim the most important paragraphs, dialogues, and descriptions from the source text that belong to this episode — do NOT summarize them, PRESERVE the original wording
   - Add structural notes: scene transitions, emotional beats, visual highlights
   - The downstream AI will have NO access to the source material — everything it needs must be in this field
   - Minimum 1000 words per episode. Longer is better. Include direct quotes from the source.`;

const SCRIPT_SPLIT_LANGUAGE_RULES = `CRITICAL LANGUAGE RULE: ALL output fields (title, description, keywords, script) MUST be in the SAME LANGUAGE as the source material. Chinese input → Chinese output. English input → English output.`;

const SCRIPT_SPLIT_OUTPUT_FORMAT = `OUTPUT FORMAT — JSON array only, no markdown fences, no commentary:
[
  {
    "title": "Episode title",
    "description": "Brief plot summary for this episode",
    "keywords": "keyword1, keyword2, keyword3",
    "idea": "1) List all characters in this episode with roles. 2) COPY the key paragraphs and dialogues from the source text verbatim — preserve original wording, do not summarize. 3) Add scene transition notes and emotional beat markers. Minimum 1000 words. The downstream screenplay generator has NO access to the source — this field is its only reference.",
    "characters": ["character name 1", "character name 2"]
  }
]

═══ EPISODE CHARACTERS ═══
You will be given a full list of extracted characters. For each episode, list ALL character names (both main and supporting) who actually appear in that specific episode. Use exact names as provided. Do NOT include every character in every episode — only those who genuinely appear, speak, or are directly involved in that episode's plot.`;

const scriptSplitDef: PromptDefinition = {
  key: "script_split",
  nameKey: "promptTemplates.prompts.scriptSplit",
  descriptionKey: "promptTemplates.prompts.scriptSplitDesc",
  category: "script",
  slots: [
    slot("role_definition", SCRIPT_SPLIT_ROLE_DEFINITION, true),
    slot("splitting_rules", SCRIPT_SPLIT_SPLITTING_RULES, true),
    slot("idea_requirements", SCRIPT_SPLIT_IDEA_REQUIREMENTS, true),
    slot("language_rules", SCRIPT_SPLIT_LANGUAGE_RULES, false),
    slot("output_format", SCRIPT_SPLIT_OUTPUT_FORMAT, false),
  ],
  buildFullPrompt(sc) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return [
      r("role_definition"),
      "",
      r("splitting_rules"),
      r("idea_requirements"),
      "",
      r("language_rules"),
      "",
      r("output_format"),
    ].join("\n");
  },
};

// ─── 4. character_extract ───────────────────────────────

const CHAR_EXTRACT_ROLE_DEFINITION = `You are a senior character designer, cinematographer, and art director. Your character descriptions are the single authoritative visual reference fed directly into a photorealistic AI image generator. Every word you write determines what the character looks like — be surgical, specific, and evocative.

Your task: extract every named character from the screenplay and produce a professional visual specification at the level of a real film production bible.`;

const CHAR_EXTRACT_STYLE_DETECTION = `═══ STEP 1 — DETECT VISUAL STYLE ═══
Identify the style declared or implied by the screenplay:
- "真人" / "realistic" / "live-action" / "photorealistic" → describe as if writing for a real-world photo shoot or high-end CG film. NO anime aesthetics whatsoever.
- "动漫" / "anime" / "manga" → describe with anime proportions, stylized features, vivid palette.
- "3D CG" / "Pixar" → describe for 3D rendering pipeline.
- "2D cartoon" → describe for cartoon illustration.
This style MUST appear in every description. A 真人 screenplay must NEVER produce anime-sounding output.`;

const CHAR_EXTRACT_OUTPUT_FORMAT = `═══ OUTPUT FORMAT ═══
JSON array only — no markdown fences, no commentary:
[
  {
    "name": "Character name exactly as written in screenplay",
    "scope": "main" or "guest",
    "description": "Full visual specification — single paragraph, all requirements below",
    "visualHint": "2–4 word visual identifier for dialogue labels (e.g. 银发金瞳, red coat auburn hair). Must be instantly recognizable at a glance — focus on the most distinctive physical trait(s).",
    "personality": "2–3 defining traits that shape posture, expression, and movement"
  }
]`;

const CHAR_EXTRACT_SCOPE_RULES = `═══ SCOPE RULES ═══
- "main": core characters who drive the story, appear in multiple scenes, or are central to the plot — protagonists, deuteragonists, key antagonists
- "guest": minor / supporting characters who appear briefly — bystanders, one-scene extras, named but non-essential roles
When in doubt, prefer "main". A character with meaningful dialogue or plot impact is "main".`;

const CHAR_EXTRACT_DESCRIPTION_REQUIREMENTS = `═══ DESCRIPTION REQUIREMENTS ═══
Write one dense, precise paragraph covering ALL of the following. The description will be passed verbatim to an image generator — write it as a professional cinematographer briefing a photographer:

0. STYLE TAG: Open with the art style (e.g., "Photorealistic live-action, shot on 85mm lens —" or "Anime style —"). This anchors the downstream renderer.

1. PHYSIQUE & BEARING: gender, apparent age, exact height feel (statuesque / petite / average), body type (lean-athletic / willowy / muscular / stocky), natural posture and how they carry themselves.

2. FACE — WRITE THIS AS A CLOSE-UP LENS DESCRIPTION:
   - Bone structure: face shape, cheekbone prominence, jawline definition (sharp / soft / angular), brow ridge
   - Eyes: shape (almond / round / hooded / monolid), size, iris color with specificity (e.g., "storm-grey", "amber-flecked hazel", "deep obsidian"), visible limbal ring, lash density
   - Nose: bridge height, tip shape (refined / bulbous / upturned), nostril width
   - Lips: fullness, cupid's bow definition, natural resting expression
   - Skin: tone with precise descriptor (e.g., "porcelain cool-white", "warm honey-gold", "deep ebony with blue undertone"), texture quality (luminous / matte / weathered), any marks
   - Overall: rate and describe their attractiveness tier — are they model-beautiful, ruggedly handsome, girl-next-door charming? Be direct.

3. HAIR: exact color (shade + undertone, e.g., "blue-black with deep indigo highlights"), length relative to body, texture (pin-straight / loose waves / tight coils), style (how it sits, falls, moves), any accessories in hair.

4. OUTFIT — PRIMARY COSTUME (full wardrobe breakdown):
   - Top: garment type, cut, material (e.g., "fitted slate-grey wool mandarin-collar jacket"), color
   - Bottom: trousers / skirt / robe type, material, color
   - Footwear: style, material, heel height if relevant
   - Outerwear / armor: describe layer by layer if applicable
   - Accessories: jewelry (describe metal, stone, style), belt, bag, gloves, hat — be specific

5. WEAPONS & EQUIPMENT (if applicable):
   - Melee weapons: blade length, edge geometry, cross-guard style, hilt wrapping material, finish (blued / polished / engraved), how it is carried (sheathed at hip / strapped to back)
   - Ranged weapons: bow / gun type, finish, any custom modifications, quiver or holster detail
   - Armor: material (plate / chain / leather), surface treatment (burnished / matte / battle-worn), any insignia or engravings
   - Other gear: describe function and appearance

6. DISTINGUISHING FEATURES: scars (location, shape, age), tattoos (design, placement), glasses (frame style, lens tint), cybernetics, non-human traits (ears, wings, horns, tail) — describe the exact visual appearance.

7. CHARACTER COLOR PALETTE: list 3–5 dominant colors that define this character's visual identity (e.g., "crimson, brushed gold, charcoal black").`;

const CHAR_EXTRACT_WRITING_RULES = `═══ WRITING RULES ═══
- ONE CONTINUOUS PARAGRAPH — no bullet points, no line breaks inside the description field
- Be specific enough that two different AI image generators produce recognizably the same character
- Use precise color names: not "red" but "blood crimson" or "dusty rose"
- Beauty matters — if the screenplay implies an attractive character, write them as genuinely, strikingly beautiful. Use the vocabulary of high-fashion photography and film casting.
- For non-human characters, apply the same level of anatomical specificity to their unique features`;

const CHAR_EXTRACT_LANGUAGE_RULES = `CRITICAL LANGUAGE RULE: ALL fields MUST be written in the SAME LANGUAGE as the screenplay. Chinese screenplay → Chinese output. English screenplay → English output. Character names must match the screenplay exactly.

Respond ONLY with the JSON array. No markdown. No commentary.`;

const characterExtractDef: PromptDefinition = {
  key: "character_extract",
  nameKey: "promptTemplates.prompts.characterExtract",
  descriptionKey: "promptTemplates.prompts.characterExtractDesc",
  category: "character",
  slots: [
    slot("role_definition", CHAR_EXTRACT_ROLE_DEFINITION, true),
    slot("style_detection", CHAR_EXTRACT_STYLE_DETECTION, true),
    slot("output_format", CHAR_EXTRACT_OUTPUT_FORMAT, false),
    slot("scope_rules", CHAR_EXTRACT_SCOPE_RULES, true),
    slot(
      "description_requirements",
      CHAR_EXTRACT_DESCRIPTION_REQUIREMENTS,
      true
    ),
    slot("writing_rules", CHAR_EXTRACT_WRITING_RULES, true),
    slot("language_rules", CHAR_EXTRACT_LANGUAGE_RULES, false),
  ],
  buildFullPrompt(sc) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return [
      r("role_definition"),
      "",
      r("style_detection"),
      "",
      r("output_format"),
      "",
      r("scope_rules"),
      "",
      r("description_requirements"),
      "",
      r("writing_rules"),
      "",
      r("language_rules"),
    ].join("\n");
  },
};

// ─── 5. import_character_extract ────────────────────────

const IMPORT_CHAR_ROLE_DEFINITION = `You are a senior character designer, cinematographer, and art director. Your task is to extract ALL named characters from the given text, estimate appearance frequency, and produce a professional visual specification for each character at the level of a real film production bible.`;

const IMPORT_CHAR_EXTRACTION_RULES = `RULES:
1. Extract EVERY character who is named in the text
2. Count approximate appearances/mentions for each character
3. Characters mentioned 2+ times are likely main characters
4. Merge obvious aliases (e.g. "小明" and "明哥" referring to the same person)

═══ STEP 1 — DETECT VISUAL STYLE ═══
Identify the style declared or implied by the text:
- "真人" / "realistic" / "live-action" / historical → describe as photorealistic cinematic. NO anime aesthetics.
- "动漫" / "anime" / "manga" → describe with anime proportions, stylized features.
- "3D CG" / "Pixar" → describe for 3D rendering.
- If no style is specified, infer from content (historical text → photorealistic historical drama).

═══ DESCRIPTION REQUIREMENTS ═══
The "description" field must be ONE dense paragraph covering ALL of the following, written as a professional cinematographer briefing a photographer:

0. STYLE TAG: Open with art style (e.g. "电影级写实历史正剧风格，无滤镜，85mm镜头特写——")
1. 【体态】: gender, apparent age, height/build, posture, how they carry themselves
2. 【面部】: face shape, jawline, brow ridge, eye shape/color, nose, lips, skin tone with precise descriptor, skin texture, attractiveness
3. 【发型】: exact color, length, style, any head accessories
4. 【服装】: full wardrobe breakdown — top, bottom, footwear, outerwear, accessories with materials and colors
5. 【武器/装备】(if applicable): detailed description of weapons, armor, gear
6. 【色彩调色板】: 3-5 dominant colors defining this character's visual identity

═══ VISUAL HINT ═══
The "visualHint" field must be 2-4 word PHYSICAL APPEARANCE tags for instant visual identification (e.g. "龙袍金冠阴沉脸", "大红直身佩刀", "silver hair red coat"). Must describe APPEARANCE, not actions.

CRITICAL LANGUAGE RULE: ALL output fields MUST be in the SAME LANGUAGE as the source text.`;

const IMPORT_CHAR_OUTPUT_FORMAT = `OUTPUT FORMAT — JSON array only, no markdown fences, no commentary:
[
  {
    "name": "Character name as it appears in text",
    "frequency": 5,
    "description": "Full visual specification — one dense paragraph following ALL requirements above",
    "visualHint": "2-4 word physical appearance identifier"
  }
]

Respond ONLY with the JSON array. No markdown. No commentary.`;

const importCharacterExtractDef: PromptDefinition = {
  key: "import_character_extract",
  nameKey: "promptTemplates.prompts.importCharacterExtract",
  descriptionKey: "promptTemplates.prompts.importCharacterExtractDesc",
  category: "character",
  slots: [
    slot("role_definition", IMPORT_CHAR_ROLE_DEFINITION, true),
    slot("extraction_rules", IMPORT_CHAR_EXTRACTION_RULES, true),
    slot("output_format", IMPORT_CHAR_OUTPUT_FORMAT, false),
  ],
  buildFullPrompt(sc) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return [r("role_definition"), "", r("extraction_rules"), "", r("output_format")].join("\n");
  },
};

// ─── 6. character_image ─────────────────────────────────

const CHAR_IMAGE_STYLE_MATCHING = `=== CRITICAL: ART STYLE ===
Read the CHARACTER DESCRIPTION below carefully. The description specifies or implies an art style (e.g. anime, manga, photorealistic, cartoon, watercolor, pixel art, oil painting, etc.).
You MUST match that exact art style in your output. Do NOT default to photorealism. Do NOT override the described style.
- If the description says "动漫" / "漫画" / "anime" / "manga" → produce anime/manga-style illustration
- If the description says "写实" / "真人" / "photorealistic" → produce photorealistic rendering
- If the description implies any other style → follow that style faithfully
- If no style is mentioned at all → infer the most appropriate style from the character's setting and genre`;

const CHAR_IMAGE_FACE_DETAIL = `=== FACE — HIGH DETAIL ===
Render the face with high precision appropriate to the chosen art style:
- Clear, consistent facial features: bone structure, eye shape, nose, mouth — all matching the described appearance
- Eyes: expressive, detailed, with catchlights and depth — adapted to art style (anime eyes for anime, realistic iris detail for photorealism, etc.)
- Hair: well-defined volume, color, and flow with style-appropriate rendering (individual strands for realism, bold clumps with highlight bands for anime, etc.)
- Skin: style-appropriate rendering — smooth cel-shading for anime, pore-level detail for photorealism, etc.
- Overall: the face should be striking and memorable, with strong visual identity`;

const CHAR_IMAGE_FOUR_VIEW_LAYOUT = `=== FOUR-VIEW LAYOUT ===
Four views arranged LEFT to RIGHT on a clean pure white canvas, consistent medium shot (waist to crown) across all four:
1. FRONT — facing viewer directly, arms relaxed at sides showing full outfit and any held weapons
2. THREE-QUARTER — rotated ~45° right, showing face depth and dimensional form
3. SIDE PROFILE — perfect 90° facing right, clear silhouette of nose, hair, and any weapons
4. BACK — fully facing away, hairstyle from behind, clothing back detail, any back-mounted equipment`;

const CHAR_IMAGE_LIGHTING_RENDERING = `=== LIGHTING & RENDERING ===
- Clean, professional lighting: key light from above-front, fill from opposite side, rim light for separation
- Pure white background for clean character separation
- Style-appropriate rendering quality — the highest quality achievable within the chosen art style
- Consistent light direction across all four views`;

const CHAR_IMAGE_CONSISTENCY_RULES = `=== CONSISTENCY ACROSS ALL FOUR VIEWS ===
- Identical character identity in every view — same face, same proportions, same exact colors
- Identical outfit, accessories, weapon placement, hair color and style
- Heads aligned at the same top edge, waist at the same bottom edge across all four views
- Consistent expression and personality across all views`;

// The name_label slot is locked because it is dynamically generated from the character name
const CHAR_IMAGE_NAME_LABEL = `=== CHARACTER NAME LABEL ===
{{NAME_LABEL_PLACEHOLDER}}`;

const characterImageDef: PromptDefinition = {
  key: "character_image",
  nameKey: "promptTemplates.prompts.characterImage",
  descriptionKey: "promptTemplates.prompts.characterImageDesc",
  category: "character",
  slots: [
    slot("style_matching", CHAR_IMAGE_STYLE_MATCHING, true),
    slot("face_detail", CHAR_IMAGE_FACE_DETAIL, true),
    slot("four_view_layout", CHAR_IMAGE_FOUR_VIEW_LAYOUT, true),
    slot("lighting_rendering", CHAR_IMAGE_LIGHTING_RENDERING, true),
    slot("consistency_rules", CHAR_IMAGE_CONSISTENCY_RULES, true),
    slot("name_label", CHAR_IMAGE_NAME_LABEL, false),
  ],
  buildFullPrompt(sc, params) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    const characterName = (params?.characterName as string) ?? undefined;
    const description = (params?.description as string) ?? "";

    // Resolve name label dynamically
    let nameLabelText: string;
    if (characterName) {
      nameLabelText = `=== CHARACTER NAME LABEL ===\n${characterName ? `Display the character's name "${characterName}" as a clean typographic label below the four-view layout. Use a modern sans-serif font, dark text on white background, centered alignment. The name should be clearly legible and presented in a professional reference-sheet style.` : "No character name label required."}`;
    } else {
      nameLabelText = `=== CHARACTER NAME LABEL ===\nNo character name label required.`;
    }

    return [
      `Character four-view reference sheet — professional character design document.`,
      "",
      r("style_matching"),
      "",
      `=== CHARACTER DESCRIPTION ===`,
      `${characterName ? `Name: ${characterName}\n` : ""}${description}`,
      "",
      r("face_detail"),
      "",
      `=== WEAPONS & EQUIPMENT (if applicable) ===`,
      `- Render all weapons, armor, and equipment in the same art style as the character`,
      `- Show material detail appropriate to the style: realistic wear for photorealism, clean stylized lines for anime/cartoon`,
      `- All equipment must be anatomically correct in scale relative to the character's body`,
      "",
      r("four_view_layout"),
      "",
      r("lighting_rendering"),
      "",
      r("consistency_rules"),
      "",
      nameLabelText,
      "",
      `=== FINAL OUTPUT STANDARD ===`,
      `Professional character design reference sheet. Highest quality for the chosen art style. Zero AI artifacts, zero inconsistencies between views. This is the single canonical reference — all future generated frames MUST reproduce this exact character in this exact style.`,
    ].join("\n");
  },
};

// ─── 7. shot_split ──────────────────────────────────────

const SHOT_SPLIT_ROLE_DEFINITION = `You are an experienced storyboard director and cinematographer specializing in animated short films. You plan shot lists that are visually dynamic, narratively efficient, and optimized for AI video generation pipelines (first frame → last frame → interpolated video).

Your task: decompose a screenplay into a precise shot list where each shot becomes one 5–15 second AI-generated video clip.`;

const SHOT_SPLIT_OUTPUT_FORMAT_TEMPLATE = `Output a JSON array:
[
  {
    "sequence": 1,
    "sceneDescription": "Scene/environment description — setting, architecture, props, weather, time of day, lighting setup, color palette, atmospheric mood",
    "startFrame": "Detailed FIRST FRAME description for AI image generation (see requirements below)",
    "endFrame": "Detailed LAST FRAME description for AI image generation (see requirements below)",
    "motionScript": "Complete action script describing what happens from first frame to last frame",
    "videoScript": "Concise 1-2 sentence motion description for video generation model (see requirements below)",
    "duration": {{MIN_DURATION}}-{{MAX_DURATION}},
    "dialogues": [
      {
        "character": "Exact character name",
        "text": "Dialogue line spoken during this shot"
      }
    ],
    "cameraDirection": "Specific camera movement instruction"
  }
]`;

const SHOT_SPLIT_START_END_FRAME_RULES = `=== startFrame & endFrame requirements (CRITICAL — these directly drive image generation) ===
Each must be a SELF-SUFFICIENT image generation prompt containing:
- COMPOSITION: frame layout — foreground/midground/background layers, character positions (left/center/right, rule-of-thirds), depth-of-field
- CHARACTERS: reference by exact name, describe CURRENT pose, expression, action, outfit (match character reference sheets)
- CAMERA: shot type (extreme close-up / close-up / medium / wide / extreme wide), angle (eye level / low angle / high angle / bird's eye / dutch angle)
- LIGHTING: direction, quality, color temperature — specific to this frame's moment
- Do NOT include dialogue text in startFrame or endFrame

=== startFrame specific rules ===
- Shows the INITIAL STATE before action begins
- Characters in starting positions with opening expressions
- Camera at its starting position/framing

=== endFrame specific rules ===
- Shows the END STATE after action completes
- Characters have MOVED to new positions, expressions changed to reflect conclusion
- Camera at its final position/framing (after cameraDirection movement)
- MUST be visually stable (not mid-motion) — this frame will be REUSED as the next shot's opening reference
- The composition must work as a standalone frame`;

const SHOT_SPLIT_MOTION_SCRIPT_RULES = `=== motionScript requirements ===
- Write as TIME-SEGMENTED narrative: "0-2s: [action]. 2-4s: [action]. 4-6s: [action]. ..."
- STRICT RULE: each segment spans AT MOST 3 seconds. A 10s shot = at least 4 segments. Never write a segment longer than 3s.
- Each segment is ONE densely-packed sentence (50-80 words) that weaves together ALL four layers simultaneously:
  • CHARACTER: exact body parts in motion — knuckles whiten, tendons flare, pupils contract, breath held, teeth clench; specify speed and force
  • ENVIRONMENT: the world reacts — ground fissures spider outward, lamp posts buckle, sparks shower at a downward angle, black smoke billows and rolls on the wind, debris trajectories
  • CAMERA: precise shot type + movement + speed — "camera slams to ground-level ultra-wide and rockets upward" / "camera holds on extreme close-up then whips right"
  • PHYSICS/ATMOSPHERE: material details — the crack of metal, shockwave ripple in the air, heat distortion, light temperature shift, particle behavior
- BAD (too vague, too long): "0-6s: The beast swings its claw and destroys the street. Camera moves in."
- GOOD (specific, max 3s): "0-2s: The iron beast plants its right foreleg with a bone-shaking thud, spider-web cracks radiating six meters outward from the impact point, all three mechanical claw-sets rising in unison trailing hydraulic mist, its sensor eye pulsing deep red; camera low-angle wide, slowly tilting up. 2-4s: The leading claw whips across with a sub-sonic crack, shearing the lamp post mid-shaft in an eruption of blue-white sparks, the severed top spinning away at 45 degrees as chunks of asphalt and shredded metal scatter downward; camera holds mid-shot then slams into a fast push-in. 4-6s: Black smoke from ruptured pipes rolls and folds across the frame on the hot shockwave, debris still raining down, the beast's sensor eye locking onto its next target with a high-pitched hydraulic whine; camera slowly orbits right on a low angle, settling on the beast's silhouette."`;

const SHOT_SPLIT_VIDEO_SCRIPT_RULES = `=== videoScript requirements ===
- PURPOSE: the PRIMARY input to the video generation model — drives all motion; must be natural Seedance-style prose
- FORMAT: 30-60 words of flowing prose, NO section labels whatsoever
  • Start with character name + brief visual identifier in parentheses (e.g. 陆云舟（月白长袍）or Sarah (red coat))
  • Describe the action — specific body movement, direction, speed
  • Embed camera movement naturally at the end of the sentence
  • One sharp atmospheric or emotional detail to set the tone
- RULES: No Scene:/Action:/Performance:/Detail: labels. No timestamps. No dialogue text (goes in dialogues array). No separate camera line.
- LANGUAGE: Same language as the screenplay
- BAD (has labels): "Scene: 湖畔垂柳。Action: 陆云舟落棋。Performance: 神情淡然。"
- BAD (separate camera): "陆云舟落棋。Camera: dolly out."
- GOOD (Chinese — prose, ~45 words):
  "陆云舟（月白长袍，玉簪束发）从棋盘上缓缓抬眼，头微侧转向斜后方，嘴角牵出一抹含笑弧度，月白纱衣随晨风轻轻摆动，镜头缓慢推近。"
- GOOD (English — prose, ~45 words):
  "The Veteran (black helmet, calm eyes) leans forward over the steering wheel, one hand adjusting the visor with practiced ease, the rain-blurred dashboard lights casting green on his face as the camera slowly pushes in."

=== sceneDescription requirements ===
- Shared environment context for both frames
- Setting, architecture, props, weather, time of day
- Lighting setup (key/fill/rim, direction, quality, color temperature)
- Color palette and atmospheric mood
- Do NOT include character actions or poses — those go in startFrame/endFrame`;

const SHOT_SPLIT_CAMERA_DIRECTIONS = `Camera direction values (choose ONE per shot):
- "static" — locked camera, no movement
- "slow zoom in" / "slow zoom out" — gradual focal length change
- "pan left" / "pan right" — horizontal sweep
- "tilt up" / "tilt down" — vertical sweep
- "tracking shot" — camera follows character movement
- "dolly in" / "dolly out" — camera physically moves toward/away
- "crane up" / "crane down" — vertical camera lift
- "orbit left" / "orbit right" — camera arcs around subject
- "push in" — slow forward dolly for emphasis`;

const SHOT_SPLIT_CINEMATOGRAPHY_PRINCIPLES_TEMPLATE = `Cinematography principles:
- VARY shot types — avoid consecutive shots with the same framing; alternate wide/medium/close
- Use ESTABLISHING SHOTS at the start of new locations
- REACTION SHOTS after important dialogue or events
- Cut on ACTION — end each shot at a moment that allows smooth transition to the next
- Match EYELINES — maintain consistent screen direction between shots
- 180-DEGREE RULE — keep characters on consistent sides of the frame
- Duration: ALL shots must be {{MIN_DURATION}}-{{MAX_DURATION}}s. Dialogue-heavy = {{DIALOGUE_MAX}}-{{MAX_DURATION}}s; action shots = {{MIN_DURATION}}-{{ACTION_MAX}}s; establishing shots = {{MIN_DURATION}}-{{ESTABLISHING_MAX}}s
- CONTINUITY: the endFrame of shot N must logically connect to the startFrame of shot N+1 (same characters, consistent environment, natural position transition)
- COVERAGE: generate AT LEAST one shot per SCENE in the screenplay. Do NOT skip or merge scenes. If a scene is complex, split it into multiple shots. Every scene marker (SCENE N) must produce at least one shot.`;

const SHOT_SPLIT_LANGUAGE_RULES = `CRITICAL LANGUAGE RULE: ALL text fields (sceneDescription, startFrame, endFrame, motionScript, dialogues.text, dialogues.character) MUST be in the SAME LANGUAGE as the screenplay. If the screenplay is in Chinese, write ALL fields in Chinese. Only "cameraDirection" uses English (technical terms).

Respond ONLY with the JSON array. No markdown fences. No commentary.`;

const SHOT_SPLIT_PROPORTIONAL_TIERS_TEMPLATE = `=== Proportional difference rule ===
{{PROPORTIONAL_TIERS}}`;

const shotSplitDef: PromptDefinition = {
  key: "shot_split",
  nameKey: "promptTemplates.prompts.shotSplit",
  descriptionKey: "promptTemplates.prompts.shotSplitDesc",
  category: "shot",
  slots: [
    slot("role_definition", SHOT_SPLIT_ROLE_DEFINITION, true),
    slot("output_format", SHOT_SPLIT_OUTPUT_FORMAT_TEMPLATE, false),
    slot("start_end_frame_rules", SHOT_SPLIT_START_END_FRAME_RULES, true),
    slot("motion_script_rules", SHOT_SPLIT_MOTION_SCRIPT_RULES, true),
    slot("video_script_rules", SHOT_SPLIT_VIDEO_SCRIPT_RULES, true),
    slot("proportional_tiers", SHOT_SPLIT_PROPORTIONAL_TIERS_TEMPLATE, true),
    slot("camera_directions", SHOT_SPLIT_CAMERA_DIRECTIONS, true),
    slot(
      "cinematography_principles",
      SHOT_SPLIT_CINEMATOGRAPHY_PRINCIPLES_TEMPLATE,
      true
    ),
    slot("language_rules", SHOT_SPLIT_LANGUAGE_RULES, false),
  ],
  buildFullPrompt(sc, params) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);

    const maxDuration =
      (params?.maxDuration as number) ?? 15;
    const minDuration = Math.min(8, maxDuration);

    // Build proportional tiers dynamically
    let proportionalTiers: string;
    if (maxDuration <= 8) {
      proportionalTiers = `- ${minDuration}-${maxDuration}s shot: keep changes proportional to duration`;
    } else {
      const tier1End = Math.round(maxDuration * 0.6);
      const tier2End = Math.round(maxDuration * 0.85);
      const tier2Start = tier1End + 1;
      const tier3Start = tier2End + 1;
      proportionalTiers =
        `- ${minDuration}-${tier1End}s shot: subtle-to-moderate change (slight head turn, expression shift, small camera move)\n` +
        `- ${tier2Start}-${tier2End}s shot: moderate change (character moves position, significant expression change, clear camera movement)\n` +
        `- ${tier3Start}-${maxDuration}s shot: significant change (character crosses frame, major action completes, dramatic camera move)`;
    }

    // Replace dynamic placeholders in output_format
    let outputFormat = r("output_format");
    outputFormat = outputFormat
      .replace(/\{\{MIN_DURATION\}\}/g, String(minDuration))
      .replace(/\{\{MAX_DURATION\}\}/g, String(maxDuration));

    // Replace dynamic placeholders in cinematography_principles
    let cinematography = r("cinematography_principles");
    cinematography = cinematography
      .replace(/\{\{MIN_DURATION\}\}/g, String(minDuration))
      .replace(/\{\{MAX_DURATION\}\}/g, String(maxDuration))
      .replace(
        /\{\{DIALOGUE_MAX\}\}/g,
        String(Math.min(maxDuration, 12))
      )
      .replace(
        /\{\{ACTION_MAX\}\}/g,
        String(Math.min(maxDuration, 12))
      )
      .replace(
        /\{\{ESTABLISHING_MAX\}\}/g,
        String(Math.min(maxDuration, 10))
      );

    // Replace proportional tiers placeholder
    let proportionalSection = r("proportional_tiers");
    proportionalSection = proportionalSection.replace(
      /\{\{PROPORTIONAL_TIERS\}\}/g,
      proportionalTiers
    );

    return [
      r("role_definition"),
      "",
      outputFormat,
      "",
      r("start_end_frame_rules"),
      "",
      r("motion_script_rules"),
      "",
      r("video_script_rules"),
      "",
      proportionalSection,
      "",
      r("camera_directions"),
      "",
      cinematography,
      "",
      r("language_rules"),
    ].join("\n");
  },
};

// ─── 8. frame_generate_first ────────────────────────────

const FIRST_FRAME_STYLE_MATCHING = `=== CRITICAL: ART STYLE (HIGHEST PRIORITY) ===
Read the CHARACTER DESCRIPTIONS and SCENE DESCRIPTION below. They specify or imply an art style.
You MUST match that exact art style. Do NOT default to photorealism.
- If descriptions mention 动漫/漫画/anime/manga/卡通/cartoon → produce anime/manga-style illustration
- If descriptions mention 写实/真人/photorealistic → produce photorealistic image
- If reference images are attached, their visual style is the ground truth — match it exactly
- The art style of the output MUST be consistent with the character reference images`;

const FIRST_FRAME_REFERENCE_RULES = `=== REFERENCE IMAGES (CHARACTER SHEETS) ===
Each attached reference image is a CHARACTER SHEET showing 4 views (front, three-quarter, side, back).
The character's NAME is printed at the bottom of each sheet — use it to identify which character it represents.
MANDATORY CONSISTENCY RULES:
- Match the character name in the sheet to the character name in the scene description
- CLOTHING MUST BE IDENTICAL to the reference — same garment type, color, material, accessories. Do NOT substitute (e.g. do NOT replace 青色常服 with 龙袍)
- Face, hairstyle, hair color, body type, skin tone must match EXACTLY
- All accessories (帽子, 佩刀, 发簪, jewelry) shown in the reference MUST appear
- Art style must match the reference images exactly`;

const FIRST_FRAME_RENDERING_QUALITY = `=== RENDERING ===
Textures: Rich detail appropriate to the art style
Lighting: Cinematic lighting with motivated light sources. Use rim lighting for character separation.
Backgrounds: Fully rendered, detailed environment. No blank or abstract backgrounds.
Characters: Match reference images exactly in appearance AND art style. Expressive faces, natural dynamic poses.
Composition: Cinematographic framing with clear focal point and depth-of-field.`;

const FIRST_FRAME_CONTINUITY_RULES = `=== CONTINUITY REQUIREMENT ===
This shot DIRECTLY follows the previous shot. The attached reference includes the previous shot's final frame. Maintain visual continuity:
- Same characters must appear in consistent outfits and proportions
- Same art style — do NOT switch between anime and photorealism
- Environmental lighting and color temperature should transition smoothly
- Character positions should logically follow from where the previous shot ended`;

const frameGenerateFirstDef: PromptDefinition = {
  key: "frame_generate_first",
  nameKey: "promptTemplates.prompts.frameGenerateFirst",
  descriptionKey: "promptTemplates.prompts.frameGenerateFirstDesc",
  category: "frame",
  slots: [
    slot("style_matching", FIRST_FRAME_STYLE_MATCHING, true),
    slot("reference_rules", FIRST_FRAME_REFERENCE_RULES, true),
    slot("rendering_quality", FIRST_FRAME_RENDERING_QUALITY, true),
    slot("continuity_rules", FIRST_FRAME_CONTINUITY_RULES, true),
  ],
  buildFullPrompt(sc, params) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    const sceneDescription =
      (params?.sceneDescription as string) ?? "";
    const startFrameDesc =
      (params?.startFrameDesc as string) ?? "";
    const characterDescriptions =
      (params?.characterDescriptions as string) ?? "";
    const previousLastFrame =
      (params?.previousLastFrame as string) ?? "";

    const lines: string[] = [];
    lines.push(`Create the OPENING FRAME of this shot as a single high-quality image.`);
    lines.push("");
    lines.push(r("style_matching"));
    lines.push("");
    lines.push(`=== SCENE ENVIRONMENT ===`);
    lines.push(sceneDescription);
    lines.push("");
    lines.push(`=== FRAME DESCRIPTION ===`);
    lines.push(startFrameDesc);
    lines.push("");
    lines.push(`=== CHARACTER DESCRIPTIONS ===`);
    lines.push(characterDescriptions);
    lines.push("");
    lines.push(r("reference_rules"));
    lines.push("");

    if (previousLastFrame) {
      lines.push(r("continuity_rules"));
      lines.push("");
    }

    lines.push(r("rendering_quality"));
    return lines.join("\n");
  },
};

// ─── 9. frame_generate_last ─────────────────────────────

const LAST_FRAME_STYLE_MATCHING = `=== CRITICAL: ART STYLE (HIGHEST PRIORITY) ===
You MUST match the EXACT art style of the first frame image (attached).
If the first frame is anime/manga style → this frame MUST also be anime/manga style.
If the first frame is photorealistic → this frame MUST also be photorealistic.
Do NOT change or mix art styles. This is non-negotiable.`;

const LAST_FRAME_RELATIONSHIP_TO_FIRST = `=== RELATIONSHIP TO FIRST FRAME ===
This closing frame shows the END STATE of the shot's action. Compared to the first frame:
- Same environment, lighting setup, and color palette
- Same art style — absolutely no style changes
- IDENTICAL clothing — characters wear the EXACT same outfit as in their reference sheets and the first frame. No costume changes.
- Same face, hairstyle, accessories — only pose/expression/position change
- Character positions, poses, and expressions have CHANGED as described in the frame description above`;

const LAST_FRAME_NEXT_SHOT_READINESS = `=== AS NEXT SHOT'S STARTING POINT ===
This frame will be reused as the next shot's opening frame. Ensure:
- The pose is STABLE — not mid-motion or blurred
- The composition is COMPLETE and works as a standalone frame
- The framing allows natural transition to a different camera angle`;

const LAST_FRAME_RENDERING_QUALITY = `=== RENDERING ===
Textures: Rich detail matching the first frame's style
Lighting: Same lighting setup as the first frame. Changes only if motivated by action.
Backgrounds: Must match the first frame's environment.
Characters: Match reference images exactly. Show emotional state at END of the shot's action.
Composition: Natural conclusion of the shot, ready to cut to the next.`;

const frameGenerateLastDef: PromptDefinition = {
  key: "frame_generate_last",
  nameKey: "promptTemplates.prompts.frameGenerateLast",
  descriptionKey: "promptTemplates.prompts.frameGenerateLastDesc",
  category: "frame",
  slots: [
    slot("style_matching", LAST_FRAME_STYLE_MATCHING, true),
    slot("relationship_to_first", LAST_FRAME_RELATIONSHIP_TO_FIRST, true),
    slot("next_shot_readiness", LAST_FRAME_NEXT_SHOT_READINESS, true),
    slot("rendering_quality", LAST_FRAME_RENDERING_QUALITY, true),
  ],
  buildFullPrompt(sc, params) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    const sceneDescription =
      (params?.sceneDescription as string) ?? "";
    const endFrameDesc =
      (params?.endFrameDesc as string) ?? "";
    const characterDescriptions =
      (params?.characterDescriptions as string) ?? "";

    const lines: string[] = [];
    lines.push(`Create the CLOSING FRAME of this shot as a single high-quality image.`);
    lines.push("");
    lines.push(r("style_matching"));
    lines.push("");
    lines.push(`=== SCENE ENVIRONMENT ===`);
    lines.push(sceneDescription);
    lines.push("");
    lines.push(`=== FRAME DESCRIPTION ===`);
    lines.push(endFrameDesc);
    lines.push("");
    lines.push(`=== CHARACTER DESCRIPTIONS ===`);
    lines.push(characterDescriptions);
    lines.push("");
    lines.push(`=== REFERENCE IMAGES ===`);
    lines.push(`The FIRST attached image is the OPENING FRAME of this same shot — use it as your visual anchor.`);
    lines.push(`The remaining attached images are CHARACTER SHEETS (4 views each, name printed at bottom).`);
    lines.push(`Match each character sheet's name to the characters in the scene.`);
    lines.push("");
    lines.push(r("relationship_to_first"));
    lines.push("");
    lines.push(r("next_shot_readiness"));
    lines.push("");
    lines.push(r("rendering_quality"));
    return lines.join("\n");
  },
};

// ─── 10. video_generate ─────────────────────────────────

const VIDEO_INTERPOLATION_HEADER = `Smoothly interpolate from the opening frame to the closing frame.`;

const VIDEO_DIALOGUE_FORMAT = `Dialogue format:
- On-screen dialogue: 【对白口型】CharacterName（visualHint）: "text"
- Off-screen narration: 【画外音】CharacterName: "text"`;

const VIDEO_FRAME_ANCHORS = `[FRAME ANCHORS]
Opening frame: {{START_FRAME_DESC}}
Closing frame: {{END_FRAME_DESC}}`;

const videoGenerateDef: PromptDefinition = {
  key: "video_generate",
  nameKey: "promptTemplates.prompts.videoGenerate",
  descriptionKey: "promptTemplates.prompts.videoGenerateDesc",
  category: "video",
  slots: [
    slot("interpolation_header", VIDEO_INTERPOLATION_HEADER, true),
    slot("dialogue_format", VIDEO_DIALOGUE_FORMAT, true),
    slot("frame_anchors", VIDEO_FRAME_ANCHORS, true),
  ],
  buildFullPrompt(sc, params) {
    // video_generate is a dynamic build function — this produces the template sections.
    // The actual assembly uses buildVideoPrompt() with runtime parameters.
    // This method returns the static template text for preview/editing purposes.
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return [
      r("interpolation_header"),
      "",
      r("dialogue_format"),
      "",
      r("frame_anchors"),
    ].join("\n");
  },
};

// ─── 11. ref_video_generate ─────────────────────────────

const REF_VIDEO_DIALOGUE_FORMAT = `Dialogue format:
- On-screen dialogue: 【对白口型】CharacterName（visualHint）: "text"
- Off-screen narration: 【画外音】CharacterName: "text"`;

const refVideoGenerateDef: PromptDefinition = {
  key: "ref_video_generate",
  nameKey: "promptTemplates.prompts.refVideoGenerate",
  descriptionKey: "promptTemplates.prompts.refVideoGenerateDesc",
  category: "video",
  slots: [
    slot("dialogue_format", REF_VIDEO_DIALOGUE_FORMAT, true),
  ],
  buildFullPrompt(sc) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return r("dialogue_format");
  },
};

// ─── 12. ref_video_prompt ───────────────────────────────

const REF_VIDEO_PROMPT_ROLE_DEFINITION = `You are a Seedance 2.0 video prompt writer. Given a FIRST FRAME (starting state) and LAST FRAME (ending state) of a shot, plus screenplay context, write a precise motion prompt describing the transition between them.

## Core principle
The video model sees the first frame as its starting point. Your job is to describe EXACTLY how to transition from the first frame to the last frame — what moves, how, and when. Study BOTH frames carefully: note changes in character position, expression, lighting, camera angle, and environment between them.`;

const REF_VIDEO_PROMPT_MOTION_RULES = `## Rules
- Match the language of the screenplay context (Chinese screenplay → Chinese prompt, English → English), pure prose, no labels
- On first mention: "Name（visual identifier）" — use EXACTLY the identifier provided in CHARACTER VISUAL IDs below (if provided). Never invent alternatives.
- Camera movement: be specific — "slow push-in", "static", "rack focus from X to Y", "handheld drift"
- Break the action into precise beats with clear causality: what happens first → then → result
- Each beat should describe physical motion: distance, speed, direction, texture of movement
- No filler adjectives ("gracefully", "gently", "softly") unless they specify HOW something moves
- Atmospheric/environment details only if they MOVE (swaying branches, rising mist, flickering light)
- 40-70 words
- If dialogue provided, keep it in original language on its own final line: 【对白口型】Name（visual identifier）: "原文台词"
- Output prompt only, no preamble`;

const REF_VIDEO_PROMPT_QUALITY_BENCHMARK = `## Quality benchmark

BAD (vague, appearance-focused):
His fingers glow with warmth as he gracefully places the piece. The atmosphere is serene and beautiful.

GOOD (precise, motion-focused):
Camera static. Yi-zhe (pale blue robe) pinches the jade piece and lowers it in a dead-slow arc through the morning mist. Contact — the board surface shudders, a dew drop rolls. His hand holds for one beat, then withdraws in a single smooth pull. Rack focus from fingertip to settled stone. Willow branches drift in the background.`;

const REF_VIDEO_PROMPT_LANGUAGE_RULES = `Match the language of the screenplay context. Output prompt only.`;

const refVideoPromptDef: PromptDefinition = {
  key: "ref_video_prompt",
  nameKey: "promptTemplates.prompts.refVideoPrompt",
  descriptionKey: "promptTemplates.prompts.refVideoPromptDesc",
  category: "video",
  slots: [
    slot("role_definition", REF_VIDEO_PROMPT_ROLE_DEFINITION, true),
    slot("motion_rules", REF_VIDEO_PROMPT_MOTION_RULES, true),
    slot("quality_benchmark", REF_VIDEO_PROMPT_QUALITY_BENCHMARK, true),
    slot("language_rules", REF_VIDEO_PROMPT_LANGUAGE_RULES, false),
  ],
  buildFullPrompt(sc) {
    const s = this.slots;
    const r = (k: string) => resolve(sc, s, k);
    return [
      r("role_definition"),
      "",
      r("motion_rules"),
      "",
      r("quality_benchmark"),
    ].join("\n");
  },
};

// ── Registry ─────────────────────────────────────────────

export const PROMPT_REGISTRY: PromptDefinition[] = [
  scriptGenerateDef,
  scriptParseDef,
  scriptSplitDef,
  characterExtractDef,
  importCharacterExtractDef,
  characterImageDef,
  shotSplitDef,
  frameGenerateFirstDef,
  frameGenerateLastDef,
  videoGenerateDef,
  refVideoGenerateDef,
  refVideoPromptDef,
];

export const PROMPT_REGISTRY_MAP: Record<string, PromptDefinition> =
  Object.fromEntries(PROMPT_REGISTRY.map((d) => [d.key, d]));

/**
 * Look up a prompt definition by key.
 */
export function getPromptDefinition(
  key: string
): PromptDefinition | undefined {
  return PROMPT_REGISTRY_MAP[key];
}

/**
 * Get the default slot contents for a prompt definition as a plain object.
 */
export function getDefaultSlotContents(
  key: string
): Record<string, string> | undefined {
  const def = PROMPT_REGISTRY_MAP[key];
  if (!def) return undefined;
  const result: Record<string, string> = {};
  for (const s of def.slots) {
    result[s.key] = s.defaultContent;
  }
  return result;
}
