'use strict';

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function buildProductionBrief(draft, options = {}) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new TypeError('draft must be an object');
  }
  const title = requireText(draft.title, 'draft.title');
  const script = requireText(draft.script, 'draft.script');
  const platform = requireText(draft.platform, 'draft.platform').toLowerCase();
  const language = requireText(draft.language, 'draft.language');
  const format = options.format ?? (platform === 'youtube' ? 'landscape-video' : 'vertical-short');
  if (!['vertical-short', 'landscape-video', 'square-post'].includes(format)) {
    throw new RangeError('format must be vertical-short, landscape-video, or square-post');
  }

  const paragraphs = script.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  if (paragraphs.length === 0) throw new TypeError('draft.script must contain at least one scene');

  let elapsedSeconds = 0;
  const scenes = paragraphs.map((voiceover, index) => {
    const words = voiceover.split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(3, Math.min(12, Math.ceil(words / 2.5)));
    const scene = {
      scene: index + 1,
      startSeconds: elapsedSeconds,
      endSeconds: elapsedSeconds + estimatedSeconds,
      voiceover,
      onScreenText: voiceover.replace(/\s+/g, ' ').slice(0, 110),
      visualDirection: index === 0
        ? 'Open with a clear, relevant visual that communicates the hook immediately.'
        : 'Show a concrete example, screen recording, diagram, or relevant b-roll; avoid decorative filler.',
      subtitleRequired: true,
      assetNeeds: ['relevant visual or b-roll', 'readable subtitles']
    };
    elapsedSeconds += estimatedSeconds;
    return scene;
  });

  const productionChecks = [
    { id: 'script-present', passed: script.length >= 40, note: 'Use a complete, coherent script.' },
    { id: 'scene-count', passed: scenes.length >= 2, note: 'Prefer multiple meaningful scenes where the script supports them.' },
    { id: 'human-review', passed: draft.approvalRequired === true, note: 'Keep human review required before publication.' },
    { id: 'not-published', passed: draft.published !== true, note: 'This brief does not publish or upload media.' }
  ];

  return {
    id: `production_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'production_brief_draft',
    sourceDraftId: typeof draft.id === 'string' ? draft.id : null,
    title,
    platform,
    language,
    format,
    aspectRatio: format === 'landscape-video' ? '16:9' : format === 'square-post' ? '1:1' : '9:16',
    estimatedDurationSeconds: elapsedSeconds,
    voiceover: scenes.map(scene => scene.voiceover).join('\n\n'),
    scenes,
    assetChecklist: [...new Set(scenes.flatMap(scene => scene.assetNeeds))],
    productionChecks,
    requiresHumanReview: true,
    mediaRendered: false,
    uploaded: false,
    limitations: [
      'This agent creates a production brief only; it does not generate voice, images, video, or subtitles as media files.',
      'Scene durations are rough estimates and require editor review.',
      'Use only licensed, owned, or otherwise authorized media assets.'
    ]
  };
}

module.exports = { buildProductionBrief };
