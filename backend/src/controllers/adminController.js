const mongoose = require('mongoose');
const User = require('../models/User');
const Animal = require('../models/Animal');
const MilkRecord = require('../models/MilkRecord');
const VaccinationRecord = require('../models/VaccinationRecord');
const WeightRecord = require('../models/WeightRecord');
const BreedingRecord = require('../models/BreedingRecord');
const MarketplaceListing = require('../models/MarketplaceListing');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');

const isId = (value) => mongoose.isValidObjectId(value);
const publicUserFields = 'name email role status createdAt updatedAt';

const createUser = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || '');
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!['farmer', 'customer'].includes(role)) return res.status(400).json({ message: 'Admin-created accounts must be farmer or customer.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name, email, password, role, status: 'active' });
    await AuditLog.create({ actor: req.user.id, action: 'user-updated', targetType: 'User', target: user._id, description: `Created a ${role} account.` });
    return res.status(201).json({ message: 'User created.', user: user.toSafeObject() });
  } catch (error) { return next(error); }
};

const getOverview = async (req, res, next) => {
  try {
    const [farmers, customers, animals, listings, orders] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'customer' }),
      Animal.countDocuments(),
      MarketplaceListing.countDocuments({ status: 'active' }),
      Order.countDocuments()
    ]);
    return res.json({ overview: { farmers, customers, animals, activeListings: listings, orders } });
  } catch (error) { return next(error); }
};

const listUsers = async (req, res, next) => {
  try {
    const { search = '', role, status } = req.query;
    const filter = { role: { $in: ['farmer', 'customer'] } };
    const conditions = [];
    if (role && ['farmer', 'customer'].includes(String(role))) filter.role = role;
    if (status === 'active') conditions.push({ $or: [{ status: 'active' }, { status: { $exists: false } }] });
    if (status === 'suspended') filter.status = status;
    const searchText = String(search).trim();
    if (searchText) conditions.push({ $or: [{ name: { $regex: searchText, $options: 'i' } }, { email: { $regex: searchText, $options: 'i' } }] });
    if (conditions.length) filter.$and = conditions;
    const users = await User.find(filter).select(publicUserFields).sort({ createdAt: -1 }).lean();
    return res.json({ users });
  } catch (error) { return next(error); }
};

const getUserDetails = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'User not found.' });
    const user = await User.findOne({ _id: req.params.id, role: { $in: ['farmer', 'customer'] } }).select(publicUserFields).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'farmer') {
      const [animals, milkRecords, vaccinations, weights, breeding, listings, orders] = await Promise.all([
        Animal.find({ farmer: user._id }).select('-farmer').sort({ createdAt: -1 }).lean(),
        MilkRecord.find({ farmer: user._id }).populate('animal', 'tagId name species').sort({ date: -1 }).lean(),
        VaccinationRecord.find({ farmer: user._id }).populate('animal', 'tagId name species').sort({ vaccinationDate: -1 }).lean(),
        WeightRecord.find({ farmer: user._id }).populate('animal', 'tagId name species').sort({ measurementDate: -1 }).lean(),
        BreedingRecord.find({ farmer: user._id }).populate('mother father', 'tagId name species sex').sort({ matingDate: -1 }).lean(),
        MarketplaceListing.find({ seller: user._id }).select('-seller').sort({ createdAt: -1 }).lean(),
        Order.find({ seller: user._id }).populate('customer', 'name email').populate('listing', 'title category').sort({ createdAt: -1 }).lean()
      ]);
      return res.json({ user, farm: { animals, milkRecords, vaccinations, weights, breeding, listings, orders } });
    }
    const orders = await Order.find({ customer: user._id }).populate('seller', 'name email').populate('listing', 'title category status').sort({ createdAt: -1 }).lean();
    return res.json({ user, customer: { orders } });
  } catch (error) { return next(error); }
};

const changeUserStatus = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'User not found.' });
    const status = String(req.body.status || '');
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'Status must be active or suspended.' });
    if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ message: 'You cannot change your own admin account status.' });
    const user = await User.findOne({ _id: req.params.id, role: { $in: ['farmer', 'customer'] } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.status === status) return res.status(409).json({ message: `User is already ${status}.` });
    user.status = status;
    await user.save();
    const action = status === 'suspended' ? 'user-suspended' : 'user-reactivated';
    await AuditLog.create({ actor: req.user.id, action, targetType: 'User', target: user._id, description: `${status === 'suspended' ? 'Suspended' : 'Reactivated'} a ${user.role} account.` });
    return res.json({ message: `User ${status === 'suspended' ? 'suspended' : 'reactivated'}.`, user: user.toSafeObject() });
  } catch (error) { return next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'User not found.' });
    const user = await User.findOne({ _id: req.params.id, role: { $in: ['farmer', 'customer'] } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const name = String(req.body.name ?? user.name).trim();
    const email = String(req.body.email ?? user.email).trim().toLowerCase();
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address.' });
    const duplicate = await User.exists({ email, _id: { $ne: user._id } });
    if (duplicate) return res.status(409).json({ message: 'Another account already uses this email.' });
    user.name = name;
    user.email = email;
    await user.save();
    await AuditLog.create({ actor: req.user.id, action: 'user-updated', targetType: 'User', target: user._id, description: `Updated a ${user.role} account profile.` });
    return res.json({ message: 'User updated.', user: user.toSafeObject() });
  } catch (error) { return next(error); }
};

const deleteUser = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'User not found.' });
    if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    const user = await User.findOne({ _id: req.params.id, role: { $in: ['farmer', 'customer'] } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const [animals, milk, vaccinations, weights, breeding, listings, orders] = await Promise.all([
      Animal.exists({ farmer: user._id }), MilkRecord.exists({ farmer: user._id }), VaccinationRecord.exists({ farmer: user._id }),
      WeightRecord.exists({ farmer: user._id }), BreedingRecord.exists({ farmer: user._id }), MarketplaceListing.exists({ seller: user._id }),
      Order.exists({ $or: [{ customer: user._id }, { seller: user._id }] })
    ]);
    if (animals || milk || vaccinations || weights || breeding || listings || orders) return res.status(409).json({ message: 'This account has related records or orders. Suspend it instead to preserve history.' });
    await User.deleteOne({ _id: user._id });
    await AuditLog.create({ actor: req.user.id, action: 'user-deleted', targetType: 'User', target: user._id, description: `Deleted an unused ${user.role} account.` });
    return res.json({ message: 'User deleted.' });
  } catch (error) { return next(error); }
};

const listListings = async (req, res, next) => {
  try {
    const { search = '', category, status, seller } = req.query;
    const filter = {};
    if (category && ['animal', 'milk', 'feed'].includes(String(category))) filter.category = category;
    if (status && ['active', 'inactive', 'reserved', 'sold'].includes(String(status))) filter.status = status;
    if (seller && isId(seller)) filter.seller = seller;
    const searchText = String(search).trim();
    if (searchText) filter.$or = [{ title: { $regex: searchText, $options: 'i' } }, { animalId: { $regex: searchText, $options: 'i' } }];
    const listings = await MarketplaceListing.find(filter).populate('seller', 'name email').populate('animal', 'tagId name species').sort({ createdAt: -1 }).lean();
    return res.json({ listings });
  } catch (error) { return next(error); }
};

const moderateListing = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Listing not found.' });
    const action = String(req.body.action || '');
    if (!['deactivate', 'reactivate'].includes(action)) return res.status(400).json({ message: 'Action must be deactivate or reactivate.' });
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    if (action === 'deactivate') {
      if (!['active', 'reserved'].includes(listing.status)) return res.status(409).json({ message: 'Only active or reserved listings can be deactivated.' });
      listing.status = 'inactive';
    } else {
      if (listing.status !== 'inactive') return res.status(409).json({ message: 'Only inactive listings can be reactivated.' });
      if (listing.availableQuantity <= 0) return res.status(409).json({ message: 'A listing must have available stock before reactivation.' });
      listing.status = 'active';
    }
    await listing.save();
    await AuditLog.create({ actor: req.user.id, action: action === 'deactivate' ? 'listing-deactivated' : 'listing-reactivated', targetType: 'MarketplaceListing', target: listing._id, description: `${action === 'deactivate' ? 'Deactivated' : 'Reactivated'} a marketplace listing.` });
    return res.json({ message: `Listing ${action}d.`, listing });
  } catch (error) { return next(error); }
};

const updateListing = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Listing not found.' });
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    const title = String(req.body.title ?? listing.title).trim();
    const description = String(req.body.description ?? listing.description).trim();
    const price = Number(req.body.price ?? listing.price);
    const quantity = Number(req.body.availableQuantity ?? listing.availableQuantity);
    const imageUrl = String(req.body.imageUrl ?? listing.imageUrl).trim();
    if (!title || title.length > 120) return res.status(400).json({ message: 'Title is required and must be 120 characters or fewer.' });
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ message: 'Price must be greater than zero.' });
    if (!Number.isFinite(quantity) || quantity < 0 || (listing.category === 'animal' && quantity !== 1)) return res.status(400).json({ message: 'Available quantity is invalid for this listing.' });
    if (listing.status === 'sold' || listing.status === 'reserved') return res.status(409).json({ message: 'Sold or reserved listings cannot be edited.' });
    if (quantity === 0 && listing.status === 'active') return res.status(409).json({ message: 'Deactivate a listing before setting its stock to zero.' });
    Object.assign(listing, { title, description, price, availableQuantity: quantity, imageUrl });
    await listing.save();
    await AuditLog.create({ actor: req.user.id, action: 'listing-updated', targetType: 'MarketplaceListing', target: listing._id, description: 'Updated marketplace listing details.' });
    return res.json({ message: 'Listing updated.', listing });
  } catch (error) { return next(error); }
};

const deleteListing = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Listing not found.' });
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    if (await Order.exists({ listing: listing._id })) return res.status(409).json({ message: 'This listing has order history and cannot be deleted. Deactivate it instead.' });
    await MarketplaceListing.deleteOne({ _id: listing._id });
    await AuditLog.create({ actor: req.user.id, action: 'listing-deleted', targetType: 'MarketplaceListing', target: listing._id, description: 'Deleted a marketplace listing without order history.' });
    return res.json({ message: 'Listing deleted.' });
  } catch (error) { return next(error); }
};

const listOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && ['pending', 'accepted', 'rejected', 'cancelled', 'completed'].includes(String(req.query.status))) filter.status = req.query.status;
    const orders = await Order.find(filter).populate('customer', 'name email').populate('seller', 'name email').populate('listing', 'title category status').sort({ createdAt: -1 }).lean();
    return res.json({ orders });
  } catch (error) { return next(error); }
};

const listLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ logs });
  } catch (error) { return next(error); }
};

module.exports = { getOverview, createUser, listUsers, getUserDetails, changeUserStatus, updateUser, deleteUser, listListings, moderateListing, updateListing, deleteListing, listOrders, listLogs };
