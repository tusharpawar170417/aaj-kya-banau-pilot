import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb, localStore } from './firebase.js';
import { signToken, verifyToken } from './lib/auth.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CLIENT_URL ?? '*' }));
app.use(express.json());

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    name: string;
    city: string | null;
    bio: string | null;
    avatar: string | null;
    passwordHash: string;
    createdAt?: string;
    updatedAt?: string;
  };
};

function normalizeIngredients(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value as Array<{ id?: string; name: string; amount: string }>;
}

function normalizeSteps(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value as string[];
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value as string[];
}

function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

async function getUserById(userId: string) {
  const db = await getDb();
  if (db) {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? { id: doc.id, ...(doc.data() ?? {}) } : null;
  }

  return localStore.users.find((user) => user.id === userId) ?? null;
}

async function getUserByEmail(email: string) {
  const db = await getDb();
  if (db) {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() ?? {}) };
  }

  return localStore.users.find((user) => user.email === email) ?? null;
}

async function getChefProfileByUserId(userId: string) {
  const db = await getDb();
  if (db) {
    const snapshot = await db.collection('chefProfiles').where('userId', '==', userId).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() ?? {}) };
  }

  return localStore.chefProfiles.find((profile) => profile.userId === userId) ?? null;
}

async function createChefProfile(user: any) {
  const profile = {
    id: randomUUID(),
    userId: user.id,
    displayName: user.name,
    specialty: 'Home cooking',
    region: 'Maharashtra',
    bio: 'New profile ready for updates.',
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    await db.collection('chefProfiles').doc(profile.id).set(profile);
    return profile;
  }

  localStore.chefProfiles.push(profile);
  return profile;
}

async function listRecipes() {
  const db = await getDb();
  if (db) {
    const snapshot = await db.collection('recipes').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
  }

  return [...localStore.recipes].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).reverse();
}

async function getRecipeById(recipeId: string) {
  const db = await getDb();
  if (db) {
    const doc = await db.collection('recipes').doc(recipeId).get();
    return doc.exists ? { id: doc.id, ...(doc.data() ?? {}) } : null;
  }

  return localStore.recipes.find((recipe) => recipe.id === recipeId) ?? null;
}

async function getAverageRating(recipeId: string) {
  const db = await getDb();
  let ratings: any[] = [];

  if (db) {
    const snapshot = await db.collection('ratings').where('recipeId', '==', recipeId).get();
    ratings = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
  } else {
    ratings = localStore.ratings.filter((rating) => rating.recipeId === recipeId);
  }

  if (!ratings.length) return { average: 0, count: 0 };

  const total = ratings.reduce((sum, rating) => sum + Number(rating.stars ?? 0), 0);
  return {
    average: Number((total / ratings.length).toFixed(1)),
    count: ratings.length,
  };
}

async function buildRecipeResponse(recipe: any) {
  const rating = await getAverageRating(recipe.id);
  const author = await getUserById(recipe.authorId ?? recipe.userId ?? recipe.author?.id ?? '');
  const chefProfile = recipe.chefProfileId ? await getChefProfileByUserId(recipe.authorId ?? recipe.userId ?? recipe.author?.id ?? '') : null;

  return {
    ...recipe,
    author: sanitizeUser(author),
    chefProfile: chefProfile ?? null,
    ingredients: normalizeIngredients(recipe.ingredients),
    steps: normalizeSteps(recipe.steps),
    tags: normalizeTags(recipe.tags),
    rating,
  };
}

async function authMiddleware(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid bearer token' });
    return;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    const user = await getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'aaj-kya-banau-api', timestamp: new Date().toISOString() });
});

app.get('/api/ready', (_req, res) => {
  res.json({
    status: 'ready',
    app: 'Aaj Kya Banau',
    features: ['auth', 'recipes', 'ratings', 'follows', 'reports'],
  });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body ?? {};

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password and name are required' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    name: String(name).trim(),
    city: 'Mumbai',
    bio: 'New chef profile pending setup.',
    avatar: '👩🏽‍🍳',
    passwordHash: await bcrypt.hash(String(password), 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    await db.collection('users').doc(user.id).set(user);
  } else {
    localStore.users.push(user);
  }

  await createChefProfile(user);

  res.status(201).json({
    token: signToken(user.id),
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await getUserByEmail(String(email).trim().toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isValidPassword = await bcrypt.compare(String(password), user.passwordHash ?? '');
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  res.json({
    token: signToken(user.id),
    user: sanitizeUser(user),
  });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const profile = await getUserById(user.id);
  res.json(sanitizeUser(profile));
});

app.get('/api/recipes', async (_req, res) => {
  const recipes = await listRecipes();
  res.json(await Promise.all(recipes.map((recipe) => buildRecipeResponse(recipe))));
});

app.get('/api/recipes/:id', async (req, res) => {
  const recipe = await getRecipeById(req.params.id);

  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }

  res.json(await buildRecipeResponse(recipe));
});

app.post('/api/recipes', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const body = req.body ?? {};

  if (!body.title || !body.description || !body.cuisine) {
    res.status(400).json({ error: 'Title, description and cuisine are required' });
    return;
  }

  const existingChefProfile = await getChefProfileByUserId(user!.id) ?? await createChefProfile(user);
  const recipe = {
    id: randomUUID(),
    title: String(body.title),
    description: String(body.description),
    cuisine: String(body.cuisine),
    category: String(body.category ?? 'Dinner'),
    region: String(body.region ?? 'India'),
    state: String(body.state ?? 'India'),
    zone: String(body.zone ?? 'Central'),
    diet: String(body.diet ?? 'Veg'),
    spiceLevel: String(body.spiceLevel ?? 'Medium'),
    minutes: Number(body.minutes ?? 30),
    servings: Number(body.servings ?? 2),
    emoji: String(body.emoji ?? '🍲'),
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    steps: Array.isArray(body.steps) ? body.steps : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    authorId: user!.id,
    chefProfileId: existingChefProfile.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    await db.collection('recipes').doc(recipe.id).set(recipe);
  } else {
    localStore.recipes.push(recipe);
  }

  res.status(201).json(await buildRecipeResponse(recipe));
});

app.post('/api/ratings', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const body = req.body ?? {};

  if (!body.targetId || !body.stars) {
    res.status(400).json({ error: 'targetId and stars are required' });
    return;
  }

  const targetId = String(body.targetId);
  const stars = Number(body.stars);
  const ratingPayload = {
    id: `${user!.id}_${targetId}_${body.type === 'chef' ? 'chef' : 'recipe'}`,
    userId: user!.id,
    recipeId: body.type === 'chef' ? null : targetId,
    chefId: body.type === 'chef' ? targetId : null,
    stars,
    review: body.review ? String(body.review).slice(0, 500) : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    const collection = db.collection('ratings');
    const existing = body.type === 'chef'
      ? await collection.where('userId', '==', user!.id).where('chefId', '==', targetId).limit(1).get()
      : await collection.where('userId', '==', user!.id).where('recipeId', '==', targetId).limit(1).get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      await doc.ref.update({ stars, review: ratingPayload.review, updatedAt: new Date().toISOString() });
      res.status(201).json({ id: doc.id, ...(doc.data() ?? {}), stars, review: ratingPayload.review, updatedAt: new Date().toISOString() });
      return;
    }

    await collection.doc(ratingPayload.id).set(ratingPayload);
    res.status(201).json(ratingPayload);
    return;
  }

  const existing = body.type === 'chef'
    ? localStore.ratings.find((rating) => rating.userId === user!.id && rating.chefId === targetId)
    : localStore.ratings.find((rating) => rating.userId === user!.id && rating.recipeId === targetId);

  if (existing) {
    Object.assign(existing, { stars, review: ratingPayload.review, updatedAt: ratingPayload.updatedAt });
    res.status(201).json(existing);
    return;
  }

  localStore.ratings.push(ratingPayload);
  res.status(201).json(ratingPayload);
});

app.post('/api/follows', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const chefId = String(req.body?.chefId ?? '');

  if (!chefId) {
    res.status(400).json({ error: 'chefId is required' });
    return;
  }

  const followKey = `${user!.id}_${chefId}`;
  const db = await getDb();
  if (db) {
    const snapshot = await db.collection('follows').where('followerId', '==', user!.id).where('chefId', '==', chefId).limit(1).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete();
      res.json({ following: false });
      return;
    }

    await db.collection('follows').doc(followKey).set({ id: followKey, followerId: user!.id, chefId, createdAt: new Date().toISOString() });
    res.status(201).json({ following: true });
    return;
  }

  const existing = localStore.follows.find((follow) => follow.followerId === user!.id && follow.chefId === chefId);
  if (existing) {
    localStore.follows = localStore.follows.filter((follow) => !(follow.followerId === user!.id && follow.chefId === chefId));
    res.json({ following: false });
    return;
  }

  localStore.follows.push({ id: followKey, followerId: user!.id, chefId, createdAt: new Date().toISOString() });
  res.status(201).json({ following: true });
});

app.post('/api/saves', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const recipeId = String(req.body?.recipeId ?? '');

  if (!recipeId) {
    res.status(400).json({ error: 'recipeId is required' });
    return;
  }

  const saveKey = `${user!.id}_${recipeId}`;
  const db = await getDb();
  if (db) {
    const snapshot = await db.collection('savedRecipes').where('userId', '==', user!.id).where('recipeId', '==', recipeId).limit(1).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete();
      res.json({ saved: false });
      return;
    }

    await db.collection('savedRecipes').doc(saveKey).set({ id: saveKey, userId: user!.id, recipeId, createdAt: new Date().toISOString() });
    res.status(201).json({ saved: true });
    return;
  }

  const existing = localStore.savedRecipes.find((save) => save.userId === user!.id && save.recipeId === recipeId);
  if (existing) {
    localStore.savedRecipes = localStore.savedRecipes.filter((save) => !(save.userId === user!.id && save.recipeId === recipeId));
    res.json({ saved: false });
    return;
  }

  localStore.savedRecipes.push({ id: saveKey, userId: user!.id, recipeId, createdAt: new Date().toISOString() });
  res.status(201).json({ saved: true });
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const body = req.body ?? {};

  if (!body.reason) {
    res.status(400).json({ error: 'A reason is required' });
    return;
  }

  const report = {
    id: randomUUID(),
    userId: user!.id,
    recipeId: body.recipeId ? String(body.recipeId) : null,
    reason: String(body.reason),
    details: body.details ? String(body.details) : null,
    createdAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    await db.collection('reports').doc(report.id).set(report);
  } else {
    localStore.reports.push(report);
  }

  res.status(201).json(report);
});

app.listen(port, () => {
  console.log(`Aaj Kya Banau API running on http://localhost:${port}`);
});

