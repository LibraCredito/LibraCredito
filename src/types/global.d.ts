import type { BlogPost } from '@/services/blogService';

declare global {
  interface Window {
    __INITIAL_DATA__?: {
      posts?: BlogPost[];
      post?: BlogPost;
    };
  }
}

export {};
