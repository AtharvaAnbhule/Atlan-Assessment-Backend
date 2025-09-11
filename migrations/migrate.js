import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your DATABASE_URL.');
      process.exit(1);
    }

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await query(schema);
    console.log('✅ Database schema created successfully');

    // Insert sample data
    await insertSampleData();
    console.log('✅ Sample data inserted successfully');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

const insertSampleData = async () => {
  try {
    // Create admin user (password: admin123)
    await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, [
      'admin@evently.com',
      '$2a$10$K8P.WZkC9lJQOQ5ZK4nJPOCxV5k5FGhwJXe4r7J9.8NjF2rZb3fHa', // admin123
      'Admin',
      'User',
      'admin'
    ]);

    // Create regular user (password: user123)
    await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, [
      'user@example.com',
      '$2a$10$rZHJPLYGF8Qc7hq7Ej8P1ONVZ8zJ7mE6x5l2HjkB8vJ8kE3fG7pH2', // user123
      'John',
      'Doe',
      'user'
    ]);

    // Get admin user ID for creating events
    const adminResult = await query('SELECT id FROM users WHERE email = $1', ['admin@evently.com']);
    const adminId = adminResult.rows[0]?.id;

    if (adminId) {
      // Insert sample events
      const events = [
        {
          name: 'Tech Conference 2025',
          description: 'Annual technology conference featuring industry leaders and innovative startups.',
          venue: 'Convention Center',
          address: '123 Tech Street, Silicon Valley, CA',
          event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          capacity: 500,
          available_tickets: 500,
          price: 99.99,
          category: 'technology',
          image_url: 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg'
        },
        {
          name: 'Music Festival Summer',
          description: 'Three-day outdoor music festival with top artists from around the world.',
          venue: 'Central Park Amphitheater',
          address: '456 Music Ave, Los Angeles, CA',
          event_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          capacity: 2000,
          available_tickets: 2000,
          price: 149.99,
          category: 'music',
          image_url: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg'
        },
        {
          name: 'Food & Wine Expo',
          description: 'Culinary experience featuring renowned chefs and premium wines.',
          venue: 'Grand Hotel Ballroom',
          address: '789 Culinary Blvd, New York, NY',
          event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          capacity: 300,
          available_tickets: 300,
          price: 79.99,
          category: 'food',
          image_url: 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg'
        },
        {
          name: 'Startup Pitch Night',
          description: 'Watch promising startups pitch their ideas to top investors.',
          venue: 'Innovation Hub',
          address: '321 Startup Lane, Austin, TX',
          event_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          capacity: 150,
          available_tickets: 150,
          price: 25.00,
          category: 'business',
          image_url: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg'
        },
        {
          name: 'Art Gallery Opening',
          description: 'Exclusive opening of contemporary art exhibition featuring local artists.',
          venue: 'Modern Art Gallery',
          address: '654 Art District, Miami, FL',
          event_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
          capacity: 100,
          available_tickets: 100,
          price: 35.00,
          category: 'art',
          image_url: 'https://images.pexels.com/photos/1839919/pexels-photo-1839919.jpeg'
        }
      ];

      for (const event of events) {
        await query(`
          INSERT INTO events (name, description, venue, address, event_date, capacity, available_tickets, price, category, image_url, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT DO NOTHING
        `, [
          event.name, event.description, event.venue, event.address,
          event.event_date, event.capacity, event.available_tickets,
          event.price, event.category, event.image_url, adminId
        ]);
      }
    }

    console.log('✅ Sample data inserted');
  } catch (error) {
    console.error('❌ Error inserting sample data:', error.message);
    throw error;
  }
};

// Run migrations if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}

export default runMigrations;