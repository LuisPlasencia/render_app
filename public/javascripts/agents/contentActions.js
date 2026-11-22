import { MESSAGE_KINDS } from '../simulation/messageCatalog.js';

const RECENT_POSTS_CONSIDERED = 10;

export function publishPostOrReply(agent, agentContext, replyProbability) {
  const recentPosts = agentContext.contentPlatform.getRecentPosts(RECENT_POSTS_CONSIDERED);
  const parentPost =
    recentPosts.length > 0 && agentContext.random.chance(replyProbability)
      ? agentContext.random.pick(recentPosts)
      : null;
  agentContext.sendToService(agent, 'social', MESSAGE_KINDS.POST, {
    parentPostId: parentPost ? parentPost.id : null
  });
}
