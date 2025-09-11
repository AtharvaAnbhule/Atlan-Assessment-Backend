-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255) NOT NULL,
    address TEXT,
    event_date TIMESTAMP NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    available_tickets INTEGER NOT NULL CHECK (available_tickets >= 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100),
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'draft')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT capacity_check CHECK (available_tickets <= capacity)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    event_id INTEGER NOT NULL REFERENCES events(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    UNIQUE(user_id, event_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Waitlist table for when events are full
CREATE TABLE IF NOT EXISTS waitlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    event_id INTEGER NOT NULL REFERENCES events(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified_at TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(user_id, event_id, status)
);

-- Seat-level booking (optional enhancement)
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    section VARCHAR(50),
    row_number VARCHAR(10),
    seat_number VARCHAR(10),
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'reserved', 'blocked')),
    booking_id INTEGER REFERENCES bookings(id),
    reserved_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, section, row_number, seat_number)
);

-- Booking history for analytics
CREATE TABLE IF NOT EXISTS booking_analytics (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    date DATE NOT NULL,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    cancellations INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_waitlist_event_user ON waitlist(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_seats_event_status ON seats(event_id, status);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update available tickets when booking is made
CREATE OR REPLACE FUNCTION update_available_tickets()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        -- Decrease available tickets on confirmed booking
        UPDATE events 
        SET available_tickets = available_tickets - NEW.quantity
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            -- Booking confirmed, decrease available tickets
            UPDATE events 
            SET available_tickets = available_tickets - NEW.quantity
            WHERE id = NEW.event_id;
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            -- Booking cancelled/expired, increase available tickets
            UPDATE events 
            SET available_tickets = available_tickets + OLD.quantity
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_ticket_update 
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_available_tickets();

-- Function to handle waitlist notifications
CREATE OR REPLACE FUNCTION check_waitlist_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    waitlist_entry RECORD;
BEGIN
    -- When a booking is cancelled, check waitlist
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        -- Find the highest priority waitlist entry for this event
        SELECT * INTO waitlist_entry
        FROM waitlist 
        WHERE event_id = NEW.event_id 
        AND status = 'waiting'
        AND quantity <= NEW.quantity
        ORDER BY priority DESC, joined_at ASC
        LIMIT 1;
        
        IF FOUND THEN
            -- Update waitlist status to notified
            UPDATE waitlist 
            SET status = 'notified', notified_at = CURRENT_TIMESTAMP
            WHERE id = waitlist_entry.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_notification_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_waitlist_on_cancellation();