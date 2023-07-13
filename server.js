const express = require('express');
const { createClient } = require('@supabase/supabase-js')
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const LRU = require('lru-cache')
const session = require('express-session')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const crypto = require('crypto');

const generateSessionSecret = () => {
  const secretLength = 32; // 32 bytes = 256 bits
  return crypto.randomBytes(secretLength).toString('hex');
};
const secret = generateSessionSecret();

const app = express();
app.use(
    session({
        secret: secret,
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());

YOUR_CLIENT_ID = '408602024887-na0q3a44ea3m3h01h05nggljca42k90h.apps.googleusercontent.com';
YOUR_CLIENT_SECRET = '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';
CALLBACK_URL = 'http://localhost:3000/auth/google/callback';

passport.use(
    new GoogleStrategy(
        {
            clientID: YOUR_CLIENT_ID,
            clientSecret: YOUR_CLIENT_SECRET,
            callbackURL: CALLBACK_URL,
        },
        (accessToken, refreshToken, profile, done) => {
            return done(null, profile);
        }
    )
);
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

const supabaseUrl = 'https://ntvkslfoxgqbpteecbse.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dmtzbGZveGdxYnB0ZWVjYnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg5NjI3NjgsImV4cCI6MjAwNDUzODc2OH0.IjL8Jjt542l9bmS5wTwDbaUI6RzfvkX1W5kcJHnOYnI';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json())
const cache = new LRU({
    max: 20,
    maxAge: 1000 * 60 * 5,
});

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Login to Google OAuth2.0
 *     description: Login in to Google, which gives access to PUT and DELETE.
 */
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    console.log('authenticated!');
});

/**
 * @swagger
 * /quotes/:
 *   post:
 *     summary: Create a new quote
 *     description: Create a new quote in the database with provided data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               author:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 created_at: 
 *                   type: string
 *                   format: date-time
 *                 author:
 *                   type: string
 *                 content:
 *                   type: string
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 */
app.post('/quotes', async (req, res) => {
    try {
        const { author, content } = req.body
        const { data, error } = await supabase
            .from('quotes')
            .insert([{ author: author, content: content }])
            .select();
        if (error) {
            throw new Error(error.message);
        }
        cache.set(`quote-${data.id}`, data);
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /quotes/:
 *   get:
 *     summary: Get all quotes
 *     description: Retrieve all quotes from the database.
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   created_at: 
 *                     type: string
 *                     format: date-time
 *                   author:
 *                     type: string
 *                   content:
 *                     type: string
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 */
app.get('/quotes', async (req, res) => {
    console.log(req.user)
    try {
        const cachedQuotes = cache.get('quotes');
        if (cachedQuotes) {
            console.log('cache hit');
            return res.status(200).json(cachedQuotes);
        }
        const { data, error } = await supabase
            .from('quotes')
            .select('*');
        if (error) {
            throw new Error(error.message);
        }
        cache.set('quotes', data);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /quotes/{id}:
 *   get:
 *     summary: Get a quote by ID
 *     description: Retrieve a quote by its ID from the database.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the quote
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 created_at: 
 *                   type: string
 *                   format: date-time
 *                 author:
 *                   type: string
 *                 content:
 *                   type: string
 *       404:
 *         description: Not found error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 *                     example: "Quote not found"
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 */
app.get('/quotes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cachedQuote = cache.get(`quote-${id}`);
        if (cachedQuote) {
            console.log('cache hit');
            return res.status(200).json(cachedQuote);
        }
        const { data, error } = await supabase
            .from('quotes')
            .select()
            .eq('id', id)
            .single();
        if (error) {
            throw new Error(error.message);
        }
        if (!data) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        cache.set(`quote-${id}`, data);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /authors/:
 *   get:
 *     summary: Get all authors
 *     description: Retrieve all unique authors from the database.
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   author:
 *                     type: string
 *                   quotes:
 *                     type: array
 *                     items:
 *                       type: integer
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 */
app.get('/authors', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
        if (error) {
            throw new Error(error.message);
        }
        count = 0;
        const authors = data.map((quote) => [quote.id, quote.author]);
        const result = authors.reduce((acc, [id, author]) => {
            const existingAuthor = acc.find(item => item.author === author);
            if (existingAuthor) {
                existingAuthor.quotes.push(id);
            } else {
                count += 1;
                acc.push({ id: count, author, quotes: [id] });
            }
            return acc;
          }, []);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /quotes/{id}:
 *   put:
 *     summary: Update a quote by ID
 *     description: Update a quote by its ID in the database with provided data.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the quote
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               author:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 created_at: 
 *                   type: string
 *                   format: date-time
 *                 author:
 *                   type: string
 *                 content:
 *                   type: string
 *       404:
 *         description: Not found error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 *                     example: "Quote not found"
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 */
app.put('/quotes/:id', async (req, res) => {
    console.log(req.user)
    if (req.isAuthenticated()) {
        try {
            const { id } = req.params;
            const { author, content } = req.body;
            const { data, error } = await supabase
              .from('quotes')
              .update({ author: author, content: content })
              .eq('id', id)
              .select();
            if (error) {
                throw new Error(error.message);
            }
            if (data.length === 0) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            cache.set(`quote-${data.id}`, data);
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(401).json({ error: 'Please authenticate' });
    }
});

/**
 * @swagger
 * /quotes/{id}:
 *   delete:
 *     summary: Delete a quote by ID
 *     description: Delete a quote by its ID in the database.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the quote
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Quote deleted successfully"
 *       404:
 *         description: Not found error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 *                     example: "Quote not found"
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                     type: string
 */
app.delete('/quotes/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('quotes')
                .delete()
                .eq('id', id)
                .select();
            if (error) {
                throw new Error(error.message);
            }
            if (data.length === 0) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            cache.del(`quote-${data.id}`);
            res.status(201).json({ message: 'Quote deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(401).json({ error: 'Please authenticate' });
    }
});

const swaggerOpts = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RESTful Quote API with Express and Supabase',
      version: '1.0.0',
      description: 'A simple CRUD API for storing and retrieving quotes',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['server.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOpts);
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
