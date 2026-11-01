import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import { APP_CONFIG } from './src/config';
import {
  Chef,
  DEFAULT_PROFILE,
  DEFAULT_USER_PREFERENCES,
  DietPreference,
  Ingredient,
  MY_CHEF_ID,
  Rating,
  Recipe,
  SEED,
  State,
  UserPreferences,
  Zone,
} from './src/data';

const KEY = 'aaj-kya-banau-pilot-v2';
const AUTH_KEY = 'aaj-kya-banau-session-v1';
const API_BASE = APP_CONFIG.apiBaseUrl;
const T = {
  ink: '#23352F',
  green: '#176A50',
  mint: '#E7F5E8',
  cream: '#FFFDF7',
  muted: '#718177',
  line: '#E3EAE2',
  orange: '#ECA866',
  white: '#FFFFFF',
};

type Tab = 'Explore' | 'Chefs' | 'Saved' | 'Studio' | 'Planner' | 'Settings';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const average = (rs: Rating[], id: string) => {
  const a = rs.filter((r) => r.targetId === id);
  return a.length
    ? `${(a.reduce((sum, r) => sum + r.stars, 0) / a.length).toFixed(1)} ★ · ${a.length}`
    : 'New · No ratings';
};

const STATE_OPTIONS = ['All India', 'Maharashtra', 'Gujarat', 'Punjab', 'Tamil Nadu', 'Karnataka', 'Kerala', 'Rajasthan', 'Delhi', 'West Bengal'];
const ZONE_OPTIONS = ['All', 'North', 'South', 'West', 'East', 'Central'];
const DIET_OPTIONS = ['Any', 'Veg', 'Non-Veg', 'Egg', 'Vegan'];
const SPICE_OPTIONS = ['Low', 'Medium', 'High'];
const COOK_OPTIONS = [20, 30, 45, 60, 90];

function Button({ label, onPress, outline = false, disabled = false }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[s.btn, outline && s.btnOutline, disabled && { opacity: 0.4 }]}>
      <Text style={[s.btnText, outline && { color: T.green }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Tag({ label, onPress, active = false }: { label: string; onPress?: () => void; active?: boolean }) {
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={[s.tag, active && { backgroundColor: T.green, borderColor: T.green }]}>
      <Text style={[s.tagText, active && { color: 'white' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function AuthGate({ onAuth }: { onAuth: (session: { token: string; user: Record<string, string> }) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('demo@aajkyabanau.com');
  const [password, setPassword] = useState('demo123');
  const [name, setName] = useState('Demo User');
  const [working, setWorking] = useState(false);

  const submit = async () => {
    setWorking(true);
    try {
      const endpoint = `${API_BASE}/${mode === 'login' ? 'auth/login' : 'auth/signup'}`;
      const payload = mode === 'login' ? { email, password } : { email, password, name };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Authentication failed');
      }

      onAuth({ token: data.token, user: data.user });
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Unable to reach the server.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.cream} />
        <View style={[s.content, { justifyContent: 'center', minHeight: '100%' }]}>
          <Text style={s.eyebrow}>SECURE ACCESS</Text>
          <Text style={s.heading}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={s.subheading}>Connect the app to the production API foundation.</Text>

          {mode === 'signup' && (
            <>
              <Text style={s.label}>Full name</Text>
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#8A9A91" />
            </>
          )}

          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#8A9A91" />

          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#8A9A91" />

          <Button label={working ? 'Loading...' : mode === 'login' ? 'Login' : 'Create account'} onPress={submit} disabled={working} />

          <TouchableOpacity style={{ marginTop: 18 }} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={s.link}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function AppBody({ session }: { session: { token: string; user: Record<string, string> } | null }) {
  const [state, setState] = useState<State>(SEED);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('Explore');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [chefDetail, setChefDetail] = useState<Chef | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ type: 'chef' | 'recipe'; id: string; name: string } | null>(null);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('Maharashtra');
  const [kind, setKind] = useState<Recipe['category']>('Breakfast');
  const [minutes, setMinutes] = useState('20');
  const [servings, setServings] = useState('2');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ id: uid(), name: '', amount: '' }]);
  const [steps, setSteps] = useState('');
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileSpecialty, setProfileSpecialty] = useState('');
  const [profileRegion, setProfileRegion] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [cuisineInput, setCuisineInput] = useState('');
  const [plannerDay, setPlannerDay] = useState(0);

  const myChef = state.chefs.find((c) => c.id === MY_CHEF_ID)!;

  const updateUserPreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setState((cur) => ({ ...cur, userPreferences: { ...cur.userPreferences, [key]: value } }));
  };

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v) {
          try {
            const parsed = JSON.parse(v) as Partial<State>;
            if (parsed.chefs && parsed.recipes) {
              setState({
                ...SEED,
                ...parsed,
                userPreferences: { ...DEFAULT_USER_PREFERENCES, ...(parsed.userPreferences || {}) },
                profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
              });
            }
          } catch {
            // ignore invalid persisted state
          }
        }
      })
      .catch(() => Alert.alert('Storage', 'Could not load saved data.'))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!session?.token) return;

    const loadRemoteData = async () => {
      try {
        const [recipesResponse, profileResponse] = await Promise.all([
          fetch(`${API_BASE}/recipes`, {
            headers: { Authorization: `Bearer ${session.token}` },
          }),
          fetch(`${API_BASE}/me`, {
            headers: { Authorization: `Bearer ${session.token}` },
          }),
        ]);

        if (recipesResponse.ok) {
          const remoteRecipes = await recipesResponse.json();
          if (Array.isArray(remoteRecipes)) {
            setState((current) => ({
              ...current,
              recipes: remoteRecipes.map((recipe: any) => ({
                ...recipe,
                id: recipe.id,
                chefId: recipe.chefProfileId ?? MY_CHEF_ID,
                title: recipe.title ?? 'Untitled recipe',
                region: recipe.region ?? 'India',
                state: recipe.state ?? 'India',
                zone: recipe.zone ?? 'West',
                category: recipe.category ?? 'Dinner',
                diet: recipe.diet ?? 'Veg',
                spiceLevel: recipe.spiceLevel ?? 'Medium',
                cuisine: recipe.cuisine ?? 'Regional',
                minutes: Number(recipe.minutes ?? 30),
                servings: Number(recipe.servings ?? 2),
                emoji: recipe.emoji ?? '🍲',
                description: recipe.description ?? '',
                ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
                steps: Array.isArray(recipe.steps) ? recipe.steps : [],
                tags: Array.isArray(recipe.tags) ? recipe.tags : [],
                createdAt: typeof recipe.createdAt === 'string' ? new Date(recipe.createdAt).getTime() : Date.now(),
              })),
            }));
          }
        }

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setState((current) => ({
            ...current,
            profile: {
              ...current.profile,
              name: profile?.name ?? current.profile.name,
              city: profile?.city ?? current.profile.city,
              bio: profile?.bio ?? current.profile.bio,
            },
          }));
        }
      } catch {
        // keep the local seeded demo data if the backend is unavailable
      }
    };

    loadRemoteData();
  }, [session]);

  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => Alert.alert('Storage', 'Could not save changes.'));
    }
  }, [state, ready]);

  const filteredRecipes = useMemo(() => {
    const prefs = state.userPreferences;
    const allergySet = new Set(state.profile.allergies.map((item) => item.trim().toLowerCase()));
    const favoriteCuisineSet = new Set(state.profile.favoriteCuisines.map((item) => item.trim().toLowerCase()));

    return state.recipes
      .filter((r) => {
        const searchText = `${r.title} ${r.description} ${r.region} ${r.cuisine} ${r.tags.join(' ')} ${r.ingredients.map((item) => item.name).join(' ')}`.toLowerCase();
        const matchesText = !query.trim() || searchText.includes(query.trim().toLowerCase());
        const matchesCategory = category === 'All' || r.category === category;
        const matchesState = prefs.state === 'All India' || r.state === prefs.state;
        const matchesZone = prefs.zone === 'All' || r.zone === prefs.zone;
        const matchesDiet = prefs.diet === 'Any' || r.diet === prefs.diet;
        const matchesTime = r.minutes <= prefs.maxCookMinutes;
        const matchesSpice =
          prefs.spiceLevel === 'High' ||
          r.spiceLevel === prefs.spiceLevel ||
          (prefs.spiceLevel === 'Medium' && ['Low', 'Medium'].includes(r.spiceLevel)) ||
          (prefs.spiceLevel === 'Low' && r.spiceLevel === 'Low');
        const matchesAllergy = !r.ingredients.some(
          (item) => allergySet.has(item.name.toLowerCase()) || (item.name.toLowerCase().includes('onion') && allergySet.has('onion')),
        );
        const matchesCuisine =
          favoriteCuisineSet.size === 0 ||
          favoriteCuisineSet.has(r.cuisine.toLowerCase()) ||
          r.tags.some((tag) => favoriteCuisineSet.has(tag.toLowerCase()));
        const matchesLocal = !prefs.localOnly || r.state === prefs.state || r.region === prefs.state;
        const matchesProtein = !prefs.proteinBoost || r.tags.some((tag) => ['protein', 'paneer', 'dal', 'lentil', 'soy', 'chickpea', 'bean'].includes(tag.toLowerCase()));

        return matchesText && matchesCategory && matchesState && matchesZone && matchesDiet && matchesTime && matchesSpice && matchesAllergy && matchesCuisine && matchesLocal && matchesProtein;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.recipes, state.profile, state.userPreferences, category, query]);

  const chefName = (id: string) => state.chefs.find((c) => c.id === id)?.name ?? 'Chef';

  const flipSaved = async (id: string) => {
    if (session?.token) {
      try {
        const response = await fetch(`${API_BASE}/saves`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ recipeId: id }),
        });

        if (response.ok) {
          const data = await response.json();
          setState((v) => ({
            ...v,
            savedRecipeIds: data.saved
              ? [...new Set([...v.savedRecipeIds, id])]
              : v.savedRecipeIds.filter((x) => x !== id),
          }));
          return;
        }
      } catch {
        // fallback to local demo behavior below
      }
    }

    setState((v) => ({
      ...v,
      savedRecipeIds: v.savedRecipeIds.includes(id) ? v.savedRecipeIds.filter((x) => x !== id) : [...v.savedRecipeIds, id],
    }));
  };

  const flipFollow = async (id: string) => {
    if (session?.token) {
      try {
        const response = await fetch(`${API_BASE}/follows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ chefId: id }),
        });

        if (response.ok) {
          const data = await response.json();
          setState((v) => ({
            ...v,
            followedChefIds: data.following
              ? [...new Set([...v.followedChefIds, id])]
              : v.followedChefIds.filter((x) => x !== id),
          }));
          return;
        }
      } catch {
        // fallback to local demo behavior below
      }
    }

    setState((v) => ({
      ...v,
      followedChefIds: v.followedChefIds.includes(id) ? v.followedChefIds.filter((x) => x !== id) : [...v.followedChefIds, id],
    }));
  };

  const addAllergy = () => {
    const value = allergyInput.trim();
    if (!value) return;
    setState((cur) => ({
      ...cur,
      profile: { ...cur.profile, allergies: Array.from(new Set([...cur.profile.allergies, value])) },
    }));
    setAllergyInput('');
  };

  const addCuisine = () => {
    const value = cuisineInput.trim();
    if (!value) return;
    setState((cur) => ({
      ...cur,
      profile: { ...cur.profile, favoriteCuisines: Array.from(new Set([...cur.profile.favoriteCuisines, value])) },
    }));
    setCuisineInput('');
  };

  const removeAllergy = (value: string) =>
    setState((cur) => ({
      ...cur,
      profile: { ...cur.profile, allergies: cur.profile.allergies.filter((item) => item !== value) },
    }));

  const removeCuisine = (value: string) =>
    setState((cur) => ({
      ...cur,
      profile: { ...cur.profile, favoriteCuisines: cur.profile.favoriteCuisines.filter((item) => item !== value) },
    }));

  const weeklyPlan = useMemo(() => {
    const dishes = filteredRecipes.length ? filteredRecipes : state.recipes;
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
      day,
      recipe: dishes[(plannerDay + index) % Math.max(dishes.length, 1)] ?? dishes[0],
    }));
  }, [filteredRecipes, plannerDay, state.recipes]);

  function openRating(type: 'chef' | 'recipe', id: string, name: string) {
    setSelected(null);
    setChefDetail(null);
    setStars(5);
    setReview('');
    setRatingTarget({ type, id, name });
  }

  async function saveRating() {
    if (!ratingTarget) return;

    const payload = {
      type: ratingTarget.type,
      targetId: ratingTarget.id,
      stars,
      review: review.trim().slice(0, 500),
    };

    if (session?.token) {
      try {
        const response = await fetch(`${API_BASE}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setRatingTarget(null);
          Alert.alert('Thank you!', 'Your rating was saved to the backend.');
          return;
        }
      } catch {
        // fallback to local save below
      }
    }

    const next: Rating = {
      targetId: ratingTarget.id,
      userId: 'pilot-local-user',
      stars,
      review: review.trim().slice(0, 500),
      createdAt: Date.now(),
    };
    const prop = ratingTarget.type === 'chef' ? 'chefRatings' : 'recipeRatings';

    setState((v) => ({
      ...v,
      [prop]: [...v[prop].filter((r) => !(r.userId === next.userId && r.targetId === next.targetId)), next],
    }));
    setRatingTarget(null);
    Alert.alert('Thank you!', 'Your rating was saved on this device.');
  }

  function resetEditor() {
    setTitle('');
    setRegion('Maharashtra');
    setKind('Breakfast');
    setMinutes('20');
    setServings('2');
    setDescription('');
    setIngredients([{ id: uid(), name: '', amount: '' }]);
    setSteps('');
    setEditing(true);
  }

  async function publish() {
    const m = Number(minutes);
    const n = Number(servings);
    const validIngredients = ingredients.filter((i) => i.name.trim() && i.amount.trim());
    const lines = steps
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!title.trim() || !region.trim() || !description.trim() || !Number.isInteger(m) || m < 1 || m > 1440 || !Number.isInteger(n) || n < 1 || n > 100 || validIngredients.length === 0 || lines.length === 0) {
      Alert.alert('Complete the recipe', 'Add title, region, description, valid minutes/servings, at least one ingredient and one instruction step.');
      return;
    }

    const recipePayload = {
      title: title.trim(),
      region: region.trim(),
      state: state.userPreferences.state === 'All India' ? 'Maharashtra' : state.userPreferences.state,
      zone: (state.userPreferences.zone === 'All' ? 'West' : state.userPreferences.zone) as Exclude<Zone, 'All'>,
      category: kind,
      diet: (state.userPreferences.diet === 'Any' ? 'Veg' : state.userPreferences.diet) as Exclude<DietPreference, 'Any'>,
      spiceLevel: state.userPreferences.spiceLevel,
      cuisine: state.profile.favoriteCuisines[0] || 'Homestyle',
      minutes: m,
      servings: n,
      description: description.trim(),
      emoji: '🍲',
      ingredients: validIngredients,
      steps: lines,
      tags: ['user-created', 'local'],
    };

    if (session?.token) {
      try {
        const response = await fetch(`${API_BASE}/recipes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
          body: JSON.stringify(recipePayload),
        });

        if (response.ok) {
          const createdRecipe = await response.json();
          setState((v) => ({ ...v, recipes: [
            {
              ...createdRecipe,
              id: createdRecipe.id,
              chefId: createdRecipe.chefProfileId ?? MY_CHEF_ID,
              region: createdRecipe.region ?? region.trim(),
              state: createdRecipe.state ?? 'Maharashtra',
              zone: createdRecipe.zone ?? 'West',
              category: createdRecipe.category ?? kind,
              diet: createdRecipe.diet ?? 'Veg',
              spiceLevel: createdRecipe.spiceLevel ?? state.userPreferences.spiceLevel,
              cuisine: createdRecipe.cuisine ?? 'Homestyle',
              minutes: Number(createdRecipe.minutes ?? m),
              servings: Number(createdRecipe.servings ?? n),
              description: createdRecipe.description ?? description.trim(),
              ingredients: Array.isArray(createdRecipe.ingredients) ? createdRecipe.ingredients : validIngredients,
              steps: Array.isArray(createdRecipe.steps) ? createdRecipe.steps : lines,
              tags: Array.isArray(createdRecipe.tags) ? createdRecipe.tags : ['user-created', 'local'],
              createdAt: typeof createdRecipe.createdAt === 'string' ? new Date(createdRecipe.createdAt).getTime() : Date.now(),
            },
            ...v.recipes,
          ] }));
          setEditing(false);
          Alert.alert('Published!', 'Your recipe now appears in Explore.');
          return;
        }
      } catch {
        // fallback to local demo behavior below
      }
    }

    const r: Recipe = {
      id: uid(),
      chefId: MY_CHEF_ID,
      title: title.trim(),
      region: region.trim(),
      state: state.userPreferences.state === 'All India' ? 'Maharashtra' : state.userPreferences.state,
      zone: (state.userPreferences.zone === 'All' ? 'West' : state.userPreferences.zone) as Exclude<Zone, 'All'>,
      category: kind,
      diet: (state.userPreferences.diet === 'Any' ? 'Veg' : state.userPreferences.diet) as Exclude<DietPreference, 'Any'>,
      spiceLevel: state.userPreferences.spiceLevel,
      cuisine: state.profile.favoriteCuisines[0] || 'Homestyle',
      minutes: m,
      servings: n,
      description: description.trim(),
      emoji: '🍲',
      ingredients: validIngredients,
      steps: lines,
      tags: ['user-created', 'local'],
      createdAt: Date.now(),
    };

    setState((v) => ({ ...v, recipes: [r, ...v.recipes] }));
    setEditing(false);
    Alert.alert('Published!', 'Your recipe now appears in Explore.');
  }

  function recipeCard(r: Recipe) {
    return (
      <TouchableOpacity key={r.id} style={s.card} onPress={() => setSelected(r)}>
        <View style={s.recipeTop}>
          <Text style={s.foodEmoji}>{r.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{r.title}</Text>
            <Text style={s.muted}>{chefName(r.chefId)} · {r.region}</Text>
            <Text style={s.muted}>{r.minutes} min · {r.category} · {r.diet}</Text>
            <Text style={[s.muted, { color: T.green }]}>{average(state.recipeRatings, r.id)}</Text>
          </View>
          <TouchableOpacity onPress={() => flipSaved(r.id)} style={s.bookmark}>
            <Text style={{ fontSize: 22 }}>{state.savedRecipeIds.includes(r.id) ? '♥' : '♡'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.desc} numberOfLines={2}>{r.description}</Text>
        <Text style={s.link}>View recipe & ingredients →</Text>
      </TouchableOpacity>
    );
  }

  function chefCard(c: Chef) {
    const recipesBy = state.recipes.filter((r) => r.chefId === c.id).length;
    return (
      <TouchableOpacity key={c.id} style={s.card} onPress={() => setChefDetail(c)}>
        <View style={s.recipeTop}>
          <Text style={s.avatar}>{c.avatar}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{c.name} {c.demo ? '· Demo' : ''}</Text>
            <Text style={s.muted}>{c.region} · {c.specialty}</Text>
            <Text style={s.muted}>{recipesBy} recipes · {average(state.chefRatings, c.id)}</Text>
          </View>
        </View>
        <Text style={s.desc}>{c.bio}</Text>
        <Text style={s.link}>View chef profile →</Text>
      </TouchableOpacity>
    );
  }

  const input = (value: string, change: (v: string) => void, placeholder: string, extra?: TextInputProps) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#8A9A91"
      style={[s.input, extra?.style]}
      value={value}
      onChangeText={change}
      {...extra}
    />
  );

  if (!ready) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={T.green} />
        <Text style={s.muted}>Loading pilot...</Text>
      </View>
    );
  }

  let body: React.ReactNode;

  if (ratingTarget) {
    body = (
      <View>
        <Text style={s.heading}>Rate {ratingTarget.type}</Text>
        <Text style={s.subheading}>{ratingTarget.name}</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setStars(n)}>
              <Text style={{ fontSize: 36, color: n <= stars ? '#E8A041' : '#D8DFD9' }}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>Your review (optional)</Text>
        {input(review, setReview, 'What did you like?', { style: { minHeight: 90, textAlignVertical: 'top' } })}
        <Button label="Submit rating" onPress={saveRating} />
        <Button label="Cancel" outline onPress={() => setRatingTarget(null)} />
      </View>
    );
  } else if (selected) {
    const r = selected;
    body = (
      <View>
        <TouchableOpacity onPress={() => setSelected(null)}>
          <Text style={s.link}>← Back to recipes</Text>
        </TouchableOpacity>
        <Text style={s.heroEmoji}>{r.emoji}</Text>
        <Text style={s.heading}>{r.title}</Text>
        <Text style={s.muted}>By {chefName(r.chefId)} · {r.region} · {r.minutes} minutes · Serves {r.servings}</Text>
        <Text style={s.desc}>{r.description}</Text>
        <Text style={s.section}>Ingredients</Text>
        {r.ingredients.map((i) => (
          <View key={i.id} style={s.ingredientRow}>
            <Text style={s.body}>• {i.name}</Text>
            <Text style={s.muted}>{i.amount}</Text>
          </View>
        ))}
        <Text style={s.section}>Preparation</Text>
        {r.steps.map((step, index) => (
          <Text key={index} style={s.step}>{index + 1}. {step}</Text>
        ))}
        <View style={s.spacer} />
        <Button label={state.savedRecipeIds.includes(r.id) ? '♥ Remove from saved' : '♡ Save recipe'} onPress={() => flipSaved(r.id)} />
        <Button label="★ Rate this recipe" outline onPress={() => openRating('recipe', r.id, r.title)} />
        <Text style={s.muted}>Recipe rating: {average(state.recipeRatings, r.id)}</Text>
        <Text style={s.note}>Sample recipes are demo content. Check ingredients and allergens before cooking.</Text>
      </View>
    );
  } else if (chefDetail) {
    const c = chefDetail;
    body = (
      <View>
        <TouchableOpacity onPress={() => setChefDetail(null)}>
          <Text style={s.link}>← Back to chefs</Text>
        </TouchableOpacity>
        <Text style={s.heroEmoji}>{c.avatar}</Text>
        <Text style={s.heading}>{c.name}</Text>
        <Text style={s.muted}>{c.region} · {c.specialty}</Text>
        <Text style={s.desc}>{c.bio}</Text>
        <Text style={s.muted}>Chef rating: {average(state.chefRatings, c.id)}</Text>
        {c.id !== MY_CHEF_ID && <Button label={state.followedChefIds.includes(c.id) ? 'Following ✓' : '＋ Follow chef'} onPress={() => flipFollow(c.id)} />}
        <Button label="★ Rate chef's recipe content" outline onPress={() => openRating('chef', c.id, c.name)} />
        <Text style={s.note}>Chef ratings reflect recipe content, not verified paid services.</Text>
        <Text style={s.section}>Recipes by {c.name}</Text>
        {state.recipes.filter((r) => r.chefId === c.id).map(recipeCard)}
      </View>
    );
  } else if (editing) {
    body = (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity onPress={() => setEditing(false)}>
          <Text style={s.link}>← Back to studio</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Publish a recipe</Text>
        <Text style={s.label}>Recipe name *</Text>
        {input(title, setTitle, 'e.g. Masala Poha')}
        <Text style={s.label}>Region *</Text>
        {input(region, setRegion, 'Maharashtra')}
        <Text style={s.label}>Meal category *</Text>
        <View style={s.wrap}>{(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as Recipe['category'][]).map((x) => <Tag key={x} label={x} active={kind === x} onPress={() => setKind(x)} />)}</View>
        <Text style={s.label}>Cooking time (minutes) *</Text>
        {input(minutes, setMinutes, '20', { keyboardType: 'numeric' })}
        <Text style={s.label}>Number of servings *</Text>
        {input(servings, setServings, '2', { keyboardType: 'numeric' })}
        <Text style={s.label}>Description *</Text>
        {input(description, setDescription, 'Tell people why this recipe is special', { style: { minHeight: 70, textAlignVertical: 'top' } })}
        <Text style={s.section}>Ingredients *</Text>
        {ingredients.map((item) => (
          <View key={item.id} style={s.ingredientInput}>
            <View style={{ flex: 2 }}>{input(item.name, (v) => setIngredients((arr) => arr.map((z) => (z.id === item.id ? { ...z, name: v } : z))), 'Ingredient')}</View>
            <View style={{ flex: 1 }}>{input(item.amount, (v) => setIngredients((arr) => arr.map((z) => (z.id === item.id ? { ...z, amount: v } : z))), '1 cup')}</View>
            <TouchableOpacity onPress={() => setIngredients((arr) => (arr.length > 1 ? arr.filter((z) => z.id !== item.id) : arr))}>
              <Text style={s.delete}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Button label="＋ Add ingredient" outline onPress={() => setIngredients((arr) => [...arr, { id: uid(), name: '', amount: '' }])} />
        <Text style={s.label}>Cooking steps — one step per line *</Text>
        {input(steps, setSteps, 'Wash vegetables\nMix the ingredients\nCook and serve', { style: { minHeight: 140, textAlignVertical: 'top' }, multiline: true })}
        <Button label="Publish recipe" onPress={publish} />
        <Text style={s.note}>Your recipe is saved locally in this pilot. Public publishing requires a backend and moderation.</Text>
      </KeyboardAvoidingView>
    );
  } else if (profileEdit) {
    body = (
      <View>
        <Text style={s.heading}>Edit chef profile</Text>
        <Text style={s.label}>Display name</Text>
        {input(profileName, setProfileName, 'Chef name')}
        <Text style={s.label}>Region</Text>
        {input(profileRegion, setProfileRegion, 'Region')}
        <Text style={s.label}>Specialty</Text>
        {input(profileSpecialty, setProfileSpecialty, 'Cooking specialty')}
        <Text style={s.label}>Bio</Text>
        {input(profileBio, setProfileBio, 'A short introduction', { style: { minHeight: 100, textAlignVertical: 'top' } })}
        <Button
          label="Save profile"
          onPress={() => {
            if (!profileName.trim()) {
              Alert.alert('Chef name required');
              return;
            }
            setState((v) => ({
              ...v,
              chefs: v.chefs.map((c) =>
                c.id === MY_CHEF_ID ? { ...c, name: profileName.trim(), region: profileRegion.trim(), specialty: profileSpecialty.trim(), bio: profileBio.trim() } : c,
              ),
            }));
            setProfileEdit(false);
          }}
        />
        <Button label="Cancel" outline onPress={() => setProfileEdit(false)} />
      </View>
    );
  } else if (tab === 'Explore') {
    body = (
      <View>
        <Text style={s.eyebrow}>DISCOVER YOUR NEXT MEAL</Text>
        <Text style={s.heading}>Aaj Kya Banau? 🍲</Text>
        <Text style={s.subheading}>Made with love, shared by chefs.</Text>
        {input(query, setQuery, '🔎 Search dishes, ingredients or region')}
        <View style={s.preferenceCard}>
          <Text style={s.section}>Your taste profile</Text>
          <Text style={s.muted}>{state.userPreferences.state} · {state.userPreferences.zone} · {state.userPreferences.diet} · {state.userPreferences.spiceLevel} spice</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
          {['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'].map((c) => (
            <Tag key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
        <Text style={s.section}>Recipes · {filteredRecipes.length}</Text>
        {filteredRecipes.length ? filteredRecipes.map(recipeCard) : <Text style={s.note}>No recipes match your current preference settings.</Text>}
      </View>
    );
  } else if (tab === 'Chefs') {
    body = (
      <View>
        <Text style={s.eyebrow}>MEET OUR CREATORS</Text>
        <Text style={s.heading}>Discover Chefs 👩🏽‍🍳</Text>
        <Text style={s.subheading}>Follow chefs and appreciate their recipes.</Text>
        {state.chefs.map(chefCard)}
      </View>
    );
  } else if (tab === 'Saved') {
    body = (
      <View>
        <Text style={s.heading}>Saved Recipes ♥</Text>
        <Text style={s.subheading}>Your personal recipe collection.</Text>
        {state.recipes.filter((r) => state.savedRecipeIds.includes(r.id)).map(recipeCard)}
        {!state.savedRecipeIds.length && <Text style={s.note}>Tap ♡ on a recipe to save it here.</Text>}
        <Text style={s.section}>Following</Text>
        {state.chefs.filter((c) => state.followedChefIds.includes(c.id)).map(chefCard)}
        {!state.followedChefIds.length && <Text style={s.note}>Follow chefs to see them here.</Text>}
      </View>
    );
  } else if (tab === 'Planner') {
    body = (
      <View>
        <Text style={s.eyebrow}>7-DAY MEAL PLAN</Text>
        <Text style={s.heading}>Smart weekly plan</Text>
        <Text style={s.subheading}>Your top picks are arranged with your preferences in mind.</Text>
        <View style={s.wrap}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <Tag key={day} label={day} active={plannerDay === index} onPress={() => setPlannerDay(index)} />
          ))}
        </View>
        {weeklyPlan.map((item) => (
          <View key={item.day} style={s.card}>
            <Text style={s.cardTitle}>{item.day}</Text>
            <Text style={s.muted}>{item.recipe.title}</Text>
            <Text style={s.desc}>{item.recipe.description}</Text>
            <Text style={s.link}>Try {item.recipe.cuisine} · {item.recipe.minutes} min</Text>
          </View>
        ))}
      </View>
    );
  } else if (tab === 'Settings') {
    body = (
      <View>
        <Text style={s.eyebrow}>USER SETTINGS</Text>
        <Text style={s.heading}>Customization</Text>
        <Text style={s.subheading}>Tune discoverability for your household and taste preferences.</Text>

        <View style={s.preferenceCard}>
          <Text style={s.section}>Profile</Text>
          {input(state.profile.name, (value) => setState((cur) => ({ ...cur, profile: { ...cur.profile, name: value } })), 'Your name')}
          <Text style={s.label}>City</Text>
          {input(state.profile.city, (value) => setState((cur) => ({ ...cur, profile: { ...cur.profile, city: value } })), 'Mumbai')}
          <Text style={s.label}>Household size</Text>
          {input(String(state.profile.householdSize), (value) => setState((cur) => ({ ...cur, profile: { ...cur.profile, householdSize: Number(value) || 1 } })), '2', { keyboardType: 'numeric' })}
        </View>

        <Text style={s.section}>Preferred state</Text>
        <View style={s.wrap}>{STATE_OPTIONS.map((item) => <Tag key={item} label={item} active={state.userPreferences.state === item} onPress={() => updateUserPreference('state', item)} />)}</View>

        <Text style={s.section}>Preferred zone</Text>
        <View style={s.wrap}>{ZONE_OPTIONS.map((item) => <Tag key={item} label={item} active={state.userPreferences.zone === item} onPress={() => updateUserPreference('zone', item as Zone)} />)}</View>

        <Text style={s.section}>Diet</Text>
        <View style={s.wrap}>{DIET_OPTIONS.map((item) => <Tag key={item} label={item} active={state.userPreferences.diet === item} onPress={() => updateUserPreference('diet', item as DietPreference)} />)}</View>

        <Text style={s.section}>Spice level</Text>
        <View style={s.wrap}>{SPICE_OPTIONS.map((item) => <Tag key={item} label={item} active={state.userPreferences.spiceLevel === item} onPress={() => updateUserPreference('spiceLevel', item as UserPreferences['spiceLevel'])} />)}</View>

        <Text style={s.section}>Cooking time</Text>
        <View style={s.wrap}>{COOK_OPTIONS.map((item) => <Tag key={String(item)} label={`${item} min`} active={state.userPreferences.maxCookMinutes === item} onPress={() => updateUserPreference('maxCookMinutes', item)} />)}</View>

        <Text style={s.section}>Allergies</Text>
        <View style={s.row}>
          <TextInput value={allergyInput} onChangeText={setAllergyInput} placeholder="Add allergen" placeholderTextColor="#8A9A91" style={[s.input, { flex: 1 }]} />
          <Button label="Add" onPress={addAllergy} />
        </View>
        <View style={s.wrap}>{state.profile.allergies.length ? state.profile.allergies.map((item) => <Tag key={item} label={item} onPress={() => removeAllergy(item)} active />) : <Text style={s.note}>No allergies added.</Text>}</View>

        <Text style={s.section}>Favorite cuisines</Text>
        <View style={s.row}>
          <TextInput value={cuisineInput} onChangeText={setCuisineInput} placeholder="Add cuisine" placeholderTextColor="#8A9A91" style={[s.input, { flex: 1 }]} />
          <Button label="Add" onPress={addCuisine} />
        </View>
        <View style={s.wrap}>{state.profile.favoriteCuisines.length ? state.profile.favoriteCuisines.map((item) => <Tag key={item} label={item} onPress={() => removeCuisine(item)} active />) : <Text style={s.note}>No cuisines saved.</Text>}</View>

        <View style={s.optionRow}>
          <TouchableOpacity style={s.toggle} onPress={() => updateUserPreference('lowSpice', !state.userPreferences.lowSpice)}>
            <Text style={s.toggleText}>{state.userPreferences.lowSpice ? 'Low spice on' : 'Low spice off'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.optionRow}>
          <TouchableOpacity style={s.toggle} onPress={() => updateUserPreference('avoidOnionGarlic', !state.userPreferences.avoidOnionGarlic)}>
            <Text style={s.toggleText}>{state.userPreferences.avoidOnionGarlic ? 'Avoid onion/garlic' : 'Allow onion/garlic'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.optionRow}>
          <TouchableOpacity style={s.toggle} onPress={() => updateUserPreference('proteinBoost', !state.userPreferences.proteinBoost)}>
            <Text style={s.toggleText}>{state.userPreferences.proteinBoost ? 'Protein boost on' : 'Protein boost off'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.optionRow}>
          <TouchableOpacity style={s.toggle} onPress={() => updateUserPreference('localOnly', !state.userPreferences.localOnly)}>
            <Text style={s.toggleText}>{state.userPreferences.localOnly ? 'Local recipes only' : 'All recipes'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else {
    body = (
      <View>
        <Text style={s.eyebrow}>CREATOR SPACE</Text>
        <Text style={s.heading}>Chef Studio 🧑🏽‍🍳</Text>
        <Text style={s.subheading}>Showcase recipes and grow your cooking portfolio.</Text>
        <View style={s.card}>
          <Text style={s.cardTitle}>{myChef.name}</Text>
          <Text style={s.muted}>{myChef.region} · {myChef.specialty}</Text>
          <Text style={s.desc}>{myChef.bio}</Text>
          <Button
            label="Edit chef profile"
            outline
            onPress={() => {
              setProfileName(myChef.name);
              setProfileBio(myChef.bio);
              setProfileRegion(myChef.region);
              setProfileSpecialty(myChef.specialty);
              setProfileEdit(true);
            }}
          />
        </View>
        <Button label="＋ Publish new recipe" onPress={resetEditor} />
        <Text style={s.section}>My recipes</Text>
        {state.recipes.filter((r) => r.chefId === MY_CHEF_ID).map(recipeCard)}
        {!state.recipes.some((r) => r.chefId === MY_CHEF_ID) && <Text style={s.note}>Your recipes will appear here after publishing.</Text>}
        <Text style={s.note}>Demo mode: all activity is on this device. A production release needs login, cloud storage, moderation, and a backend.</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.cream} />
        <View style={s.topbar}>
          <Text style={s.brand}>🍃 Aaj Kya Banau?</Text>
          <Text style={s.pilot}>PILOT</Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {body}
          <View style={{ height: 36 }} />
        </ScrollView>
        <View style={s.nav}>
          {(['Explore', 'Chefs', 'Saved', 'Studio', 'Planner', 'Settings'] as Tab[]).map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => {
                setSelected(null);
                setChefDetail(null);
                setRatingTarget(null);
                setEditing(false);
                setProfileEdit(false);
                setTab(item);
              }}
              style={s.navItem}
            >
              <Text style={{ fontSize: 19 }}>{item === 'Explore' ? '⌕' : item === 'Chefs' ? '♨' : item === 'Saved' ? '♥' : item === 'Planner' ? '🗓' : item === 'Settings' ? '⚙' : '✎'}</Text>
              <Text style={[s.navText, tab === item && { color: T.green, fontWeight: '800' }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [session, setSession] = useState<{ token: string; user: Record<string, string> } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((value) => {
        if (value) {
          try {
            const parsed = JSON.parse(value) as { token?: string; user?: Record<string, string> };
            if (parsed.token && parsed.user) {
              setSession({ token: parsed.token, user: parsed.user });
            }
          } catch {
            // ignore invalid saved session
          }
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      AsyncStorage.removeItem(AUTH_KEY).catch(() => undefined);
      return;
    }

    AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session)).catch(() => undefined);
  }, [ready, session]);

  if (!ready) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={T.green} />
        <Text style={s.muted}>Loading session...</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthGate onAuth={setSession} />;
  }

  return <AppBody session={session} />;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.cream },
  topbar: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: T.line },
  brand: { fontSize: 16, fontWeight: '800', color: T.green },
  pilot: { fontSize: 10, letterSpacing: 2, color: T.green, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 10 },
  heading: { fontSize: 28, fontWeight: '900', color: T.ink, marginTop: 8, marginBottom: 8 },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: T.green, fontWeight: '800' },
  subheading: { fontSize: 14, color: T.muted, marginBottom: 20 },
  section: { fontSize: 19, color: T.ink, fontWeight: '800', marginTop: 22, marginBottom: 12 },
  card: { backgroundColor: T.white, borderWidth: 1, borderColor: T.line, borderRadius: 20, padding: 16, marginBottom: 12 },
  preferenceCard: { backgroundColor: T.mint, borderWidth: 1, borderColor: T.line, borderRadius: 18, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: T.ink, marginBottom: 4 },
  recipeTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  foodEmoji: { fontSize: 45, width: 65, textAlign: 'center' },
  avatar: { fontSize: 42, width: 65, textAlign: 'center' },
  muted: { color: T.muted, fontSize: 12, lineHeight: 20 },
  desc: { fontSize: 14, color: T.ink, lineHeight: 21, marginVertical: 10 },
  link: { color: T.green, fontSize: 13, fontWeight: '800', marginTop: 9, marginBottom: 8 },
  bookmark: { padding: 10 },
  btn: { backgroundColor: T.green, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', marginTop: 11 },
  btnOutline: { backgroundColor: T.white, borderWidth: 1.5, borderColor: T.green },
  btnText: { color: 'white', fontSize: 14, fontWeight: '800' },
  tag: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: T.white, borderWidth: 1, borderColor: T.line, marginRight: 6, marginBottom: 4 },
  tagText: { fontSize: 12, fontWeight: '700', color: T.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  input: { borderWidth: 1, borderColor: T.line, borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: 'white', color: T.ink, marginTop: 7, marginBottom: 12, minHeight: 46 },
  label: { fontSize: 13, fontWeight: '700', color: T.ink, marginTop: 10 },
  body: { fontSize: 14, color: T.ink },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ingredientInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  delete: { fontSize: 26, color: T.orange, paddingHorizontal: 10 },
  note: { color: T.muted, fontSize: 12, marginTop: 12, lineHeight: 20 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: T.line, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: T.white },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navText: { fontSize: 11, color: T.muted, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  stars: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  heroEmoji: { fontSize: 52, marginTop: 8, marginBottom: 6 },
  spacer: { height: 14 },
  step: { fontSize: 14, color: T.ink, lineHeight: 22, marginBottom: 6 },
  optionRow: { marginTop: 10 },
  toggle: { backgroundColor: T.white, borderColor: T.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  toggleText: { fontSize: 14, color: T.ink, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
