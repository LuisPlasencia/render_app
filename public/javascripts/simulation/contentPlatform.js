import { TRAFFIC_CLASS_BY_ID } from '../shared/trafficClasses.js';

export class ContentPlatform {
  constructor(maximumFeedLength = 40) {
    this.maximumFeedLength = maximumFeedLength;
    this.feed = [];
    this.postsById = new Map();
    this.nextPostId = 1;
    this.statistics = {
      totalPosts: 0,
      syntheticPosts: 0,
      humanRepliesToHuman: 0,
      humanRepliesToSynthetic: 0,
      syntheticRepliesToHuman: 0,
      syntheticRepliesToSynthetic: 0,
      longestAutomatedChain: 0
    };
  }

  publishPost({ authorTrafficClassId, parentPostId, publishedAt }) {
    const isSynthetic = !TRAFFIC_CLASS_BY_ID[authorTrafficClassId].isHuman;
    const parentPost = parentPostId ? this.postsById.get(parentPostId) : null;
    // Number of consecutive non-human posts in the thread up to this one
    const automatedChainLength = isSynthetic ? (parentPost ? parentPost.automatedChainLength : 0) + 1 : 0;

    const post = {
      id: this.nextPostId++,
      authorTrafficClassId,
      isSynthetic,
      parentPostId: parentPost ? parentPost.id : null,
      automatedChainLength,
      publishedAt
    };

    this.updateStatistics(post, parentPost);
    this.addToFeed(post);
    return post;
  }

  getRecentPosts(count) {
    return this.feed.slice(-count);
  }

  getStatistics() {
    return { ...this.statistics };
  }

  updateStatistics(post, parentPost) {
    const statistics = this.statistics;
    statistics.totalPosts += 1;
    if (post.isSynthetic) {
      statistics.syntheticPosts += 1;
    }
    if (parentPost) {
      if (post.isSynthetic) {
        statistics[parentPost.isSynthetic ? 'syntheticRepliesToSynthetic' : 'syntheticRepliesToHuman'] += 1;
      } else {
        statistics[parentPost.isSynthetic ? 'humanRepliesToSynthetic' : 'humanRepliesToHuman'] += 1;
      }
    }
    statistics.longestAutomatedChain = Math.max(statistics.longestAutomatedChain, post.automatedChainLength);
  }

  addToFeed(post) {
    this.feed.push(post);
    this.postsById.set(post.id, post);
    if (this.feed.length > this.maximumFeedLength) {
      const evictedPost = this.feed.shift();
      this.postsById.delete(evictedPost.id);
    }
  }
}
