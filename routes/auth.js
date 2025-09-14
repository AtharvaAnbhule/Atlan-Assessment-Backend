import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import {
  validate,
  registerSchema,
  loginSchema,
} from "../middleware/validation.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

router.use(authLimiter);

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, first_name, last_name, role } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
        code: "USER_ALREADY_EXISTS",
      });
    }

    const user = await User.create({
      email,
      password,
      first_name,
      last_name,
      role,
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
      token,
    });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const isValidPassword = await User.verifyPassword(
      password,
      user.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
      token,
    });
  })
);

router.get(
  "/profile",
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        role: req.user.role,
        created_at: req.user.created_at,
      },
    });
  })
);

router.put(
  "/profile",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { first_name, last_name } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        error: "First name and last name are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    const updatedUser = await User.updateProfile(req.user.id, {
      first_name,
      last_name,
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  })
);

router.put(
  "/change-password",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: "Current password and new password are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
        code: "PASSWORD_TOO_SHORT",
      });
    }

    const user = await User.findByEmail(req.user.email);

    const isValidPassword = await User.verifyPassword(
      current_password,
      user.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Current password is incorrect",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }

    await User.changePassword(req.user.id, new_password);

    res.json({
      message: "Password changed successfully",
    });
  })
);

router.post(
  "/refresh",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      message: "Token refreshed successfully",
      token,
    });
  })
);

export default router;
