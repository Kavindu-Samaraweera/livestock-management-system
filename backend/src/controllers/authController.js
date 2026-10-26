const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(['farmer', 'customer']);

const issueToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in the environment');
  }

  return jwt.sign({ sub: user._id.toString(), role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
};

const validateCredentials = ({ name, email, password, role }, isRegistration) => {
  const errors = {};

  if (isRegistration && (!name || name.trim().length < 2)) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (isRegistration && !ROLES.has(role)) {
    errors.role = 'Role must be farmer or customer.';
  }

  return errors;
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const errors = validateCredentials(req.body, true);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token: issueToken(user),
      user: user.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const errors = validateCredentials(req.body, false);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please enter a valid email and password.', errors });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    const passwordMatches = user ? await user.comparePassword(password) : false;

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended.' });
    }

    return res.status(200).json({
      message: 'Login successful.',
      token: issueToken(user),
      user: user.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    return res.status(200).json({ user: user.toSafeObject() });
  } catch (error) {
    return next(error);
  }
};

const updateCurrentUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const errors = {};

    if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    if (!email || !EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (newPassword && newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters.';
    if (newPassword && !currentPassword) errors.currentPassword = 'Current password is required to change your password.';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    const normalizedEmail = email.trim().toLowerCase();
    const emailOwner = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (emailOwner) return res.status(409).json({ message: 'An account with this email already exists.' });

    if (newPassword && !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect.', errors: { currentPassword: 'Current password is incorrect.' } });
    }

    user.name = name.trim();
    user.email = normalizedEmail;
    if (newPassword) user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: 'Profile settings saved.', user: user.toSafeObject() });
  } catch (error) {
    return next(error);
  }
};

const roleAccess = (role) => (req, res) => {
  res.status(200).json({
    message: `${role} access granted.`,
    role: req.user.role
  });
};

module.exports = { register, login, getCurrentUser, updateCurrentUser, roleAccess };
