export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  city?: string;
  bio?: string;
  avatar?: string;
  isChef?: boolean;
  chefProfileId?: string;
};

export type RecipeRecord = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  category: string;
  region: string;
  state: string;
  zone: string;
  diet: string;
  spiceLevel: string;
  minutes: number;
  servings: number;
  emoji?: string;
  ingredients: Array<{ id: string; name: string; amount: string }>;
  steps: string[];
  tags: string[];
  createdAt: string;
  chefProfileId: string;
  authorId: string;
};

export type RatingRecord = {
  id: string;
  userId: string;
  recipeId?: string;
  chefId?: string;
  stars: number;
  review?: string;
  createdAt: string;
};

export type FollowRecord = {
  id: string;
  followerId: string;
  chefId: string;
  createdAt: string;
};

export type SavedRecipeRecord = {
  id: string;
  userId: string;
  recipeId: string;
  createdAt: string;
};

export type ReportRecord = {
  id: string;
  userId: string;
  recipeId?: string;
  reason: string;
  details?: string;
  createdAt: string;
};

export const demoUsers: UserRecord[] = [
  {
    id: 'user_demo_1',
    email: 'demo@aajkyabanau.com',
    name: 'Demo User',
    passwordHash: '$2a$10$5xXJI8b8hKzU7b5tR1cK8O3gV0kXxP4C7QvY7a3mFZ1E2P0lGOMq',
    city: 'Mumbai',
    bio: 'Loves local home-style recipes.',
    avatar: '👩🏽‍🍳',
    isChef: false,
  },
];

export const demoChefProfiles = [
  {
    id: 'chef_demo_1',
    userId: 'user_demo_1',
    displayName: 'Chef Asha',
    specialty: 'Traditional breakfast',
    region: 'Maharashtra',
    bio: 'Authentic home recipes with local ingredients.',
    isVerified: true,
  },
];

export const demoRecipes: RecipeRecord[] = [
  {
    id: 'recipe_demo_1',
    title: 'Kanda Poha',
    description: 'Soft flattened rice tossed with onion, peanuts and lemon.',
    cuisine: 'Maharashtrian',
    category: 'Breakfast',
    region: 'Maharashtra',
    state: 'Maharashtra',
    zone: 'West',
    diet: 'Veg',
    spiceLevel: 'Low',
    minutes: 20,
    servings: 2,
    emoji: '🍚',
    ingredients: [
      { id: 'ing_1', name: 'Poha', amount: '1 cup' },
      { id: 'ing_2', name: 'Onion', amount: '1 medium' },
      { id: 'ing_3', name: 'Peanuts', amount: '2 tbsp' },
    ],
    steps: ['Rinse poha briefly.', 'Sauté onion and peanuts.', 'Fold in poha and turmeric.', 'Finish with lemon.'],
    tags: ['breakfast', 'local', 'quick'],
    createdAt: new Date().toISOString(),
    chefProfileId: 'chef_demo_1',
    authorId: 'user_demo_1',
  },
  {
    id: 'recipe_demo_2',
    title: 'Besan Chilla',
    description: 'Savory gram flour pancakes with veggies.',
    cuisine: 'Gujarati',
    category: 'Breakfast',
    region: 'Gujarat',
    state: 'Gujarat',
    zone: 'West',
    diet: 'Veg',
    spiceLevel: 'Low',
    minutes: 15,
    servings: 2,
    emoji: '🥞',
    ingredients: [
      { id: 'ing_4', name: 'Besan', amount: '1 cup' },
      { id: 'ing_5', name: 'Tomato', amount: '1/2' },
      { id: 'ing_6', name: 'Onion', amount: '1/2' },
    ],
    steps: ['Mix batter with water.', 'Add onions and tomato.', 'Cook on a flat pan.', 'Serve warm.'],
    tags: ['breakfast', 'vegetarian'],
    createdAt: new Date().toISOString(),
    chefProfileId: 'chef_demo_1',
    authorId: 'user_demo_1',
  },
];

export const demoRatings: RatingRecord[] = [];
export const demoFollows: FollowRecord[] = [];
export const demoSavedRecipes: SavedRecipeRecord[] = [];
export const demoReports: ReportRecord[] = [];
