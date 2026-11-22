// Share of each group's content requests that ask for video segments
export const DEFAULT_TRAFFIC_PROFILE = {
  videoRequestShareByGroup: { human: 0.1, bot: 0.01 }
};

export function normalizeTrafficProfile(rawProfile) {
  const rawShares = (rawProfile && rawProfile.videoRequestShareByGroup) || {};
  const clampShare = (value, fallback) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback);
  return {
    videoRequestShareByGroup: {
      human: clampShare(rawShares.human, DEFAULT_TRAFFIC_PROFILE.videoRequestShareByGroup.human),
      bot: clampShare(rawShares.bot, DEFAULT_TRAFFIC_PROFILE.videoRequestShareByGroup.bot)
    }
  };
}
