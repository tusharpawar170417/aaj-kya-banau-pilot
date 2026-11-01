import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { signToken, verifyToken } from './lib/auth.js';

const prisma = new PrismaClient();
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

async function getAverageRating(recipeId: string) {
  const ratings = await prisma.rating.findMany({ where: { recipeId } });
  if (!ratings.length) return { average: 0, count: 0 };

  const total = ratings.reduce((sum, rating) => sum + rating.stars, 0);
  return {
    average: Number((total / ratings.length).toFixed(1)),
    count: ratings.length,
  };
}

async function buildRecipeResponse(recipe: any) {
  const rating = await getAverageRating(recipe.id);
  return {
    ...recipe,
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
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

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
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: String(name).trim(),
      passwordHash,
      city: 'Mumbai',
      bio: 'New chef profile pending setup.',
      avatar: '👩🏽‍🍳',
    },
  });

  await prisma.chefProfile.create({
    data: {
      userId: user.id,
      displayName: user.name,
      specialty: 'Home cooking',
      region: 'Maharashtra',
      bio: 'New profile ready for updates.',
      isVerified: false,
    },
  });

  res.status(201).json({
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      city: user.city,
      bio: user.bio,
      avatar: user.avatar,
    },
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isValidPassword = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  res.json({
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      city: user.city,
      bio: user.bio,
      avatar: user.avatar,
    },
  });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  res.json({
    id: profile?.id,
    email: profile?.email,
    name: profile?.name,
    city: profile?.city,
    bio: profile?.bio,
    avatar: profile?.avatar,
  });
});

app.get('/api/recipes', async (_req, res) => {
  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: 'desc' },
    include: { author: true, chefProfile: true },
  });

  res.json(await Promise.all(recipes.map((recipe) => buildRecipeResponse(recipe))));
});

app.get('/api/recipes/:id', async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    include: { author: true, chefProfile: true },
  });

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

  const chefProfile = await prisma.chefProfile.findUnique({ where: { userId: user!.id } })
    ?? await prisma.chefProfile.create({
      data: {
        userId: user!.id,
        displayName: user!.name,
        specialty: 'Home cooking',
        region: 'Maharashtra',
        bio: 'New profile ready for updates.',
        isVerified: false,
      },
    });

  const recipe = await prisma.recipe.create({
    data: {
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
      chefProfileId: chefProfile.id,
      authorId: user!.id,
    },
    include: { author: true, chefProfile: true },
  });

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

  if (body.type === 'chef') {
    const rating = await prisma.rating.upsert({
      where: {
        userId_chefId: {
          userId: user!.id,
          chefId: targetId,
        },
      },
      create: {
        userId: user!.id,
        chefId: targetId,
        stars,
        review: body.review ? String(body.review).slice(0, 500) : null,
      },
      update: {
        stars,
        review: body.review ? String(body.review).slice(0, 500) : null,
      },
    });

    res.status(201).json(rating);
    return;
  }

  const rating = await prisma.rating.upsert({
    where: {
      userId_recipeId: {
        userId: user!.id,
        recipeId: targetId,
      },
    },
    create: {
      userId: user!.id,
      recipeId: targetId,
      stars,
      review: body.review ? String(body.review).slice(0, 500) : null,
    },
    update: {
      stars,
      review: body.review ? String(body.review).slice(0, 500) : null,
    },
  });

  res.status(201).json(rating);
});

app.post('/api/follows', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const chefId = String(req.body?.chefId ?? '');

  if (!chefId) {
    res.status(400).json({ error: 'chefId is required' });
    return;
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_chefId: {
        followerId: user!.id,
        chefId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({
      where: {
        id: existing.id,
      },
    });
    res.json({ following: false });
    return;
  }

  await prisma.follow.create({
    data: {
      followerId: user!.id,
      chefId,
    },
  });

  res.status(201).json({ following: true });
});

app.post('/api/saves', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const recipeId = String(req.body?.recipeId ?? '');

  if (!recipeId) {
    res.status(400).json({ error: 'recipeId is required' });
    return;
  }

  const existing = await prisma.savedRecipe.findUnique({
    where: {
      userId_recipeId: {
        userId: user!.id,
        recipeId,
      },
    },
  });

  if (existing) {
    await prisma.savedRecipe.delete({
      where: {
        id: existing.id,
      },
    });
    res.json({ saved: false });
    return;
  }

  await prisma.savedRecipe.create({
    data: {
      userId: user!.id,
      recipeId,
    },
  });

  res.status(201).json({ saved: true });
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const body = req.body ?? {};

  if (!body.reason) {
    res.status(400).json({ error: 'A reason is required' });
    return;
  }

  const report = await prisma.report.create({
    data: {
      userId: user!.id,
      recipeId: body.recipeId ? String(body.recipeId) : null,
      reason: String(body.reason),
      details: body.details ? String(body.details) : null,
    },
  });

  res.status(201).json(report);
});

app.listen(port, () => {
  console.log(`Aaj Kya Banau API running on http://localhost:${port}`);
});
