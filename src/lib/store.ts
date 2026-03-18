// localStorage utility for Student Connect
export const SC = {
  get: <T = any>(key: string): T[] => {
    try {
      return JSON.parse(localStorage.getItem(`sc_${key}`) || '[]');
    } catch {
      return [] as T[];
    }
  },
  set: (key: string, val: any) => {
    localStorage.setItem(`sc_${key}`, JSON.stringify(val));
  },
  getOne: <T = any>(key: string): T | null => {
    try {
      return JSON.parse(localStorage.getItem(`sc_${key}`) || 'null');
    } catch {
      return null;
    }
  },
  setOne: (key: string, val: any) => {
    localStorage.setItem(`sc_${key}`, JSON.stringify(val));
  },
};

export interface Post {
  id: number;
  author: string;
  avatar: string;
  content: string;
  image?: string;
  date: string;
  likes: number;
  comments: { author: string; text: string; date: string }[];
  likedByUser?: boolean;
}

export interface Blog {
  id: number;
  title: string;
  content: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
}

export interface UserProfile {
  name: string;
  email: string;
  bio: string;
  major: string;
  year: string;
  interests: string[];
  skills: string[];
  avatar: string;
  linkedin: string;
  github: string;
}

export const defaultProfile: UserProfile = {
  name: 'Student User',
  email: 'student@kjsit.edu.in',
  bio: 'A passionate student at KJSIT.',
  major: 'Computer Engineering',
  year: '3rd Year',
  interests: ['Web Development', 'AI/ML', 'Open Source'],
  skills: ['React', 'JavaScript', 'Python'],
  avatar: '',
  linkedin: '',
  github: '',
};

export const seedData = () => {
  if (SC.get('posts').length === 0) {
    SC.set('posts', [
      { id: 1, author: 'Aarav Sharma', avatar: '', content: 'Just finished my final year project on AI-powered healthcare! 🎉 Looking for feedback from peers.', date: '2026-03-18', likes: 12, comments: [{ author: 'Priya Patel', text: 'Amazing work! Would love to see a demo.', date: '2026-03-18' }], likedByUser: false },
      { id: 2, author: 'Sneha Gupta', avatar: '', content: 'Hackathon this weekend at KJSIT! Who\'s joining? Let\'s form a team 💻', date: '2026-03-17', likes: 24, comments: [], likedByUser: false },
      { id: 3, author: 'Raj Deshmukh', avatar: '', content: 'Just published my first npm package! Check it out and give feedback 📦', date: '2026-03-16', likes: 8, comments: [{ author: 'Aarav Sharma', text: 'Congrats! What does it do?', date: '2026-03-16' }], likedByUser: false },
    ]);
  }
  if (SC.get('blogs').length === 0) {
    SC.set('blogs', [
      { id: 1, title: 'Getting Started with Machine Learning', content: 'Machine learning is transforming every industry. In this blog, we explore the fundamentals of ML, including supervised and unsupervised learning, neural networks, and practical applications. Whether you\'re a beginner or looking to deepen your understanding, this guide covers the essential concepts you need to know.\n\nWe\'ll start with the basics of data preprocessing, move on to model selection, and finally discuss evaluation metrics. By the end, you\'ll have a solid foundation to start your ML journey.', author: 'Aarav Sharma', date: '2026-03-15', category: 'Technology', readTime: '5 min' },
      { id: 2, title: 'Campus Life at KJSIT: A Complete Guide', content: 'KJSIT offers a vibrant campus life with numerous clubs, events, and opportunities. From the annual tech fest to cultural celebrations, there\'s always something happening. This guide covers everything from the best study spots to the most popular hangout areas.\n\nJoining clubs is one of the best ways to make friends and develop skills outside the classroom. Whether you\'re into coding, robotics, or art, there\'s a club for you.', author: 'Sneha Gupta', date: '2026-03-12', category: 'Campus Life', readTime: '4 min' },
      { id: 3, title: 'Top 10 Resources for Web Development', content: 'Looking to level up your web development skills? Here are the top 10 resources that every aspiring web developer should bookmark. From free courses to comprehensive documentation, these resources cover everything from HTML basics to advanced React patterns.\n\n1. MDN Web Docs\n2. freeCodeCamp\n3. The Odin Project\n4. CSS-Tricks\n5. JavaScript.info\n6. React Documentation\n7. Frontend Masters\n8. Codecademy\n9. Stack Overflow\n10. GitHub Learning Lab', author: 'Raj Deshmukh', date: '2026-03-10', category: 'Resources', readTime: '3 min' },
    ]);
  }
  if (!SC.getOne('profile')) {
    SC.setOne('profile', defaultProfile);
  }
};
