const express = require('express');
const { createClient } = require('@supabase/supabase-js')
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

const supabaseUrl = 'https://ntvkslfoxgqbpteecbse.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dmtzbGZveGdxYnB0ZWVjYnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg5NjI3NjgsImV4cCI6MjAwNDUzODc2OH0.IjL8Jjt542l9bmS5wTwDbaUI6RzfvkX1W5kcJHnOYnI';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json())

// Route to create a new note
app.post('/quotes', async (req, res) => {
    try {
        const { author, content } = req.body
        console.log(author + " :: " + content)
        const { data, error } = await supabase
            .from('quotes')
            .insert([{ author: author, content: content }])
            .select();
        if (error) {
            throw new Error(error.message);
        }
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to retrieve all notes
app.get('/quotes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('quotes')
            .select('*');
        if (error) {
            throw new Error(error.message);
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to retrieve a specific note
app.get('/quotes/:id', async (req, res) => {
    try {
        const { id } = req.params;
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
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to update a specific note
app.put('/quotes/:id', async (req, res) => {
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
        console.log(data)
        if (data.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to delete a specific note
app.delete('/quotes/:id', async (req, res) => {
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
        res.json({ message: 'Quote deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RESTful API with Express, Supabase, and Sequelize',
      version: '1.0.0',
      description: 'A simple CRUD API for storing and retrieving notes',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['server.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
