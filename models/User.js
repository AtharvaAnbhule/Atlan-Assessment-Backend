import bcrypt from "bcryptjs";
import { query } from "../config/database.js";

export class User {
  static async create(userData) {
    const { email, password, first_name, last_name, role = "user" } = userData;

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, created_at
    `,
      [email, password_hash, first_name, last_name, role]
    );

    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateProfile(id, updateData) {
    const { first_name, last_name } = updateData;

    const result = await query(
      `
      UPDATE users 
      SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, first_name, last_name, role, updated_at
    `,
      [first_name, last_name, id]
    );

    return result.rows[0];
  }

  static async changePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 10);

    await query(
      `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [password_hash, id]
    );
  }

  static async getAllUsers() {
    const result = await query(`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users 
      ORDER BY created_at DESC
    `);
    return result.rows;
  }
}
