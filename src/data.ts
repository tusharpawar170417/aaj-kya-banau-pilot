export type Ingredient = { id: string; name: string; amount: string };
export type Chef = { id: string; name: string; region: string; specialty: string; bio: string; avatar: string; demo?: boolean };
export type DietPreference = 'Any' | 'Veg' | 'Non-Veg' | 'Egg' | 'Vegan';
export type Zone = 'All' | 'North' | 'South' | 'West' | 'East' | 'Central';
export type SpiceLevel = 'Low' | 'Medium' | 'High';
export type UserProfile = {
  name: string;
  city: string;
  allergies: string[];
  favoriteCuisines: string[];
  householdSize: number;
};
export type UserPreferences = {
  state: string;
  zone: Zone;
  diet: DietPreference;
  spiceLevel: SpiceLevel;
  maxCookMinutes: number;
  avoidOnionGarlic: boolean;
  proteinBoost: boolean;
  lowSpice: boolean;
  localOnly: boolean;
};
export type Recipe = {
  id: string;
  chefId: string;
  title: string;
  region: string;
  state: string;
  zone: Exclude<Zone, 'All'>;
  category: 'Breakfast'|'Lunch'|'Dinner'|'Snack';
  diet: Exclude<DietPreference, 'Any'>;
  spiceLevel: SpiceLevel;
  cuisine: string;
  minutes: number;
  servings: number;
  emoji: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  createdAt: number;
};
export type Rating = { userId: string; targetId: string; stars: number; review: string; createdAt: number };
export type State = { chefs: Chef[]; recipes: Recipe[]; recipeRatings: Rating[]; chefRatings: Rating[]; followedChefIds: string[]; savedRecipeIds: string[]; userPreferences: UserPreferences; profile: UserProfile };

export const MY_CHEF_ID = 'my-chef';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  state: 'Maharashtra',
  zone: 'West',
  diet: 'Veg',
  spiceLevel: 'Medium',
  maxCookMinutes: 45,
  avoidOnionGarlic: false,
  proteinBoost: false,
  lowSpice: false,
  localOnly: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Aaj User',
  city: 'Mumbai',
  allergies: [],
  favoriteCuisines: ['Maharashtrian', 'Gujarati'],
  householdSize: 2,
};

export const SEED: State = {
  chefs: [
    {id:'c1',name:'Chef Asha',region:'Maharashtra',specialty:'Traditional breakfast',bio:'I love sharing quick, authentic home recipes.',avatar:'👩🏽‍🍳',demo:true},
    {id:'c2',name:'Chef Meera',region:'Gujarat',specialty:'Vegetarian classics',bio:'Simple cooking with the taste of home.',avatar:'👩🏻‍🍳',demo:true},
    {id:'c3',name:'Chef Arjun',region:'Punjab',specialty:'Comfort meals',bio:'Homestyle meals with easy-to-follow steps.',avatar:'👨🏽‍🍳',demo:true},
    {id:MY_CHEF_ID,name:'My Chef Studio',region:'India',specialty:'Home cooking',bio:'My collection of favourite family recipes.',avatar:'🧑🏽‍🍳'}
  ],
  recipes: [
    {id:'r1',chefId:'c1',title:'Kanda Poha',region:'Maharashtra',state:'Maharashtra',zone:'West',category:'Breakfast',diet:'Veg',spiceLevel:'Low',cuisine:'Maharashtrian',minutes:20,servings:2,emoji:'🍚',description:'Soft, lemony flattened rice with onions and peanuts.',ingredients:[{id:'i1',name:'Poha',amount:'1 cup'},{id:'i2',name:'Onion',amount:'1 medium'},{id:'i3',name:'Peanuts',amount:'2 tbsp'},{id:'i4',name:'Turmeric',amount:'¼ tsp'},{id:'i5',name:'Lemon',amount:'½'}],steps:['Rinse poha briefly and drain.','Toast peanuts, then sauté onion with turmeric.','Fold in poha and cook gently for 3 minutes.','Finish with lemon and serve warm.'],tags:['breakfast','local','quick','protein'],createdAt:1},
    {id:'r2',chefId:'c2',title:'Besan Chilla',region:'Gujarat',state:'Gujarat',zone:'West',category:'Breakfast',diet:'Veg',spiceLevel:'Low',cuisine:'Gujarati',minutes:15,servings:2,emoji:'🥞',description:'Crispy gram-flour pancakes with fresh vegetables.',ingredients:[{id:'i1',name:'Besan',amount:'1 cup'},{id:'i2',name:'Onion',amount:'½'},{id:'i3',name:'Tomato',amount:'½'},{id:'i4',name:'Water',amount:'As needed'}],steps:['Whisk besan, water and seasoning.','Mix in finely chopped vegetables.','Spread thinly on a warm lightly oiled pan.','Cook both sides until golden.'],tags:['breakfast','vegetarian','easy','protein'],createdAt:2},
    {id:'r3',chefId:'c3',title:'Rajma Rice',region:'Punjab',state:'Punjab',zone:'North',category:'Lunch',diet:'Veg',spiceLevel:'Medium',cuisine:'Punjabi',minutes:45,servings:3,emoji:'🍛',description:'Kidney beans in a comforting tomato gravy.',ingredients:[{id:'i1',name:'Cooked rajma',amount:'2 cups'},{id:'i2',name:'Tomato',amount:'2'},{id:'i3',name:'Onion',amount:'1'},{id:'i4',name:'Rice',amount:'1 cup'}],steps:['Cook rice separately.','Sauté onion and tomato with spices.','Simmer cooked kidney beans until the gravy thickens.','Serve hot with rice.'],tags:['lunch','comfort','protein','family'],createdAt:3},
    {id:'r4',chefId:'c1',title:'Thalipeeth',region:'Maharashtra',state:'Maharashtra',zone:'West',category:'Dinner',diet:'Veg',spiceLevel:'Medium',cuisine:'Maharashtrian',minutes:30,servings:2,emoji:'🫓',description:'A hearty Maharashtrian multigrain flatbread.',ingredients:[{id:'i1',name:'Bhajani flour',amount:'1 cup'},{id:'i2',name:'Onion',amount:'½'},{id:'i3',name:'Coriander',amount:'2 tbsp'},{id:'i4',name:'Water',amount:'As needed'}],steps:['Combine flour, onion and coriander.','Knead with water into soft dough.','Pat thin and cook on a hot tawa.','Serve with curd or chutney.'],tags:['dinner','regional','hearty','local'],createdAt:4},
    {id:'r5',chefId:'c2',title:'Gujarati Dhokla',region:'Gujarat',state:'Gujarat',zone:'West',category:'Snack',diet:'Veg',spiceLevel:'Low',cuisine:'Gujarati',minutes:35,servings:4,emoji:'🟨',description:'Fluffy steamed savory cakes.',ingredients:[{id:'i1',name:'Besan',amount:'1 cup'},{id:'i2',name:'Curd',amount:'½ cup'},{id:'i3',name:'Fruit salt',amount:'1 tsp'},{id:'i4',name:'Mustard seeds',amount:'½ tsp'}],steps:['Make a smooth batter with besan and curd.','Stir in fruit salt immediately before steaming.','Steam until cooked through.','Temper mustard seeds and pour over cut dhokla.'],tags:['snack','light','local','protein'],createdAt:5},
    {id:'r6',chefId:'c3',title:'Paneer Bhurji Bowl',region:'Punjab',state:'Punjab',zone:'North',category:'Dinner',diet:'Veg',spiceLevel:'High',cuisine:'Punjabi',minutes:25,servings:2,emoji:'🥘',description:'A quick skillet of crumbled paneer with peppers and spice.',ingredients:[{id:'i1',name:'Paneer',amount:'200 g'},{id:'i2',name:'Bell pepper',amount:'1'},{id:'i3',name:'Tomato',amount:'1'},{id:'i4',name:'Onion',amount:'½'}],steps:['Sauté onion and pepper.','Add chopped tomato and spice blend.','Fold in crumbled paneer and cook until hot.','Serve with roti or rice.'],tags:['protein','paneer','quick','high-spice'],createdAt:6}
  ],
  recipeRatings:[],
  chefRatings:[],
  followedChefIds:[],
  savedRecipeIds:[],
  userPreferences: DEFAULT_USER_PREFERENCES,
  profile: DEFAULT_PROFILE,
};
