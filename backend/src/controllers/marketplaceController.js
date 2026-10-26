const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const MarketplaceListing = require('../models/MarketplaceListing');
const Order = require('../models/Order');

const categories = new Set(['animal', 'milk', 'feed']);
const statuses = new Set(['active', 'inactive', 'reserved', 'sold']);
const isId = (value) => mongoose.isValidObjectId(value);
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : NaN;

const listingValues = (body, existing = {}) => {
  const category = String(body.category ?? existing.category ?? '').toLowerCase();
  const price = safeNumber(body.price ?? existing.price);
  const quantity = safeNumber(body.availableQuantity ?? existing.availableQuantity ?? (category === 'animal' ? 1 : undefined));
  const errors = {};
  if (!categories.has(category)) errors.category = 'Category must be animal, milk, or feed.';
  if (!String(body.title ?? existing.title ?? '').trim()) errors.title = 'Title is required.';
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Price must be greater than zero.';
  if (!Number.isFinite(quantity) || quantity < 0) errors.availableQuantity = 'Available quantity must be zero or greater.';
  if (category === 'animal') {
    if (!isId(body.animal ?? existing.animal)) errors.animal = 'Select a valid animal.';
    if (quantity !== 1) errors.availableQuantity = 'An animal listing must have quantity one.';
  }
  if (category === 'milk' && (!String(body.unit ?? existing.unit ?? 'litres').trim())) errors.unit = 'Milk unit is required.';
  if (category === 'feed' && !String(body.feedType ?? existing.feedType ?? '').trim()) errors.feedType = 'Feed type is required.';
  if (body.status && !statuses.has(String(body.status))) errors.status = 'Invalid listing status.';
  return { errors, values: {
    category, title: String(body.title ?? existing.title ?? '').trim(), description: String(body.description ?? existing.description ?? '').trim(), price,
    currency: String(body.currency ?? existing.currency ?? process.env.MARKETPLACE_CURRENCY ?? 'LKR').trim().toUpperCase(), imageUrl: String(body.imageUrl ?? existing.imageUrl ?? '').trim(),
    status: String(body.status ?? existing.status ?? 'active'), animal: body.animal ?? existing.animal ?? null, animalType: body.animalType ?? existing.animalType ?? null,
    animalId: String(body.animalId ?? existing.animalId ?? '').trim(), sex: body.sex ?? existing.sex ?? null, breed: String(body.breed ?? existing.breed ?? '').trim(),
    dateOfBirth: body.dateOfBirth ?? existing.dateOfBirth ?? null, availableQuantity: quantity, unit: String(body.unit ?? existing.unit ?? (category === 'milk' ? 'litres' : category === 'feed' ? 'kg' : 'animal')).trim(),
    feedType: String(body.feedType ?? existing.feedType ?? '').trim(), productName: String(body.productName ?? existing.productName ?? '').trim(), packaging: String(body.packaging ?? existing.packaging ?? '').trim(), freshness: String(body.freshness ?? existing.freshness ?? '').trim(), collectionDate: body.collectionDate ?? existing.collectionDate ?? null, storageNotes: String(body.storageNotes ?? existing.storageNotes ?? '').trim()
  } };
};

const populateListing = (query) => query.populate('seller', 'name').populate('animal', 'tagId name species sex breed dateOfBirth');

const listListings = async (req, res, next) => {
  try {
    const { search = '', category, animalType, sex, sort = 'newest', minPrice, maxPrice } = req.query;
    const filter = { status: 'active' };
    if (category && categories.has(String(category).toLowerCase())) filter.category = String(category).toLowerCase();
    if (animalType && ['cow', 'goat'].includes(String(animalType).toLowerCase())) filter.animalType = String(animalType).toLowerCase();
    if (sex && ['male', 'female'].includes(String(sex).toLowerCase())) filter.sex = String(sex).toLowerCase();
    const text = String(search).trim(); if (text) filter.$or = [{ title: { $regex: text, $options: 'i' } }, { description: { $regex: text, $options: 'i' } }, { animalId: { $regex: text, $options: 'i' } }];
    if (Number.isFinite(Number(minPrice))) filter.price = { ...(filter.price || {}), $gte: Number(minPrice) };
    if (Number.isFinite(Number(maxPrice))) filter.price = { ...(filter.price || {}), $lte: Number(maxPrice) };
    const order = sort === 'price-low' ? { price: 1 } : sort === 'price-high' ? { price: -1 } : { createdAt: -1 };
    const listings = await populateListing(MarketplaceListing.find(filter).sort(order)).lean();
    return res.json({ listings });
  } catch (error) { return next(error); }
};

const listMine = async (req, res, next) => { try { const listings = await populateListing(MarketplaceListing.find({ seller: req.user.id }).sort({ createdAt: -1 })).lean(); return res.json({ listings }); } catch (error) { return next(error); } };

const getListing = async (req, res, next) => { try { if (!isId(req.params.id)) return res.status(404).json({ message: 'Listing not found.' }); const visibility = req.user ? { $or: [{ status: 'active' }, { seller: req.user.id }] } : { status: 'active' }; const listing = await populateListing(MarketplaceListing.findOne({ _id: req.params.id, ...visibility })).lean(); if (!listing) return res.status(404).json({ message: 'Listing not found.' }); return res.json({ listing }); } catch (error) { return next(error); } };

const createListing = async (req, res, next) => {
  try {
    const { errors, values } = listingValues(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the listing fields.', errors });
    if (values.category === 'animal') {
      const animal = await Animal.findOne({ _id: values.animal, farmer: req.user.id }).lean();
      if (!animal) return res.status(404).json({ message: 'Animal not found.' });
      const alreadyListed = await MarketplaceListing.exists({ animal: animal._id, status: { $in: ['active', 'reserved'] } });
      if (alreadyListed) return res.status(409).json({ message: 'This animal is already actively listed.' });
      Object.assign(values, { animalType: animal.species, animalId: animal.tagId, sex: animal.sex, breed: animal.breed, dateOfBirth: animal.dateOfBirth, availableQuantity: 1, unit: 'animal' });
    }
    const listing = await MarketplaceListing.create({ ...values, seller: req.user.id });
    return res.status(201).json({ message: 'Listing created successfully.', listing });
  } catch (error) { return next(error); }
};

const updateListing = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Listing not found.' });
    const listing = await MarketplaceListing.findOne({ _id: req.params.id, seller: req.user.id }); if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    const { errors, values } = listingValues(req.body, listing.toObject()); if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the listing fields.', errors });
    if (listing.category !== values.category) return res.status(400).json({ message: 'Listing category cannot be changed.' });
    if (listing.status === 'sold' && values.status === 'active') return res.status(409).json({ message: 'Sold listings cannot be reactivated.' });
    if (values.status === 'active' && values.availableQuantity <= 0) return res.status(409).json({ message: 'A listing must have available stock before activation.' });
    if (listing.animal) values.animal = listing.animal;
    Object.assign(listing, values); await listing.save(); return res.json({ message: 'Listing updated successfully.', listing });
  } catch (error) { return next(error); }
};

const deleteListing = async (req, res, next) => { try { if (!isId(req.params.id)) return res.status(404).json({ message: 'Listing not found.' }); const hasHistory = await Order.exists({ listing: req.params.id }); if (hasHistory) return res.status(409).json({ message: 'This listing has order history and cannot be deleted. Deactivate it instead.' }); const result = await MarketplaceListing.deleteOne({ _id: req.params.id, seller: req.user.id }); if (!result.deletedCount) return res.status(404).json({ message: 'Listing not found.' }); return res.json({ message: 'Listing deleted successfully.' }); } catch (error) { return next(error); } };

const createOrder = async (req, res, next) => {
  try {
    if (!isId(req.body.listing)) return res.status(400).json({ message: 'Select a valid listing.' });
    const listing = await MarketplaceListing.findOne({ _id: req.body.listing, status: 'active' }).lean(); if (!listing) return res.status(409).json({ message: 'This listing is no longer available.' });
    if (String(listing.seller) === String(req.user.id)) return res.status(400).json({ message: 'You cannot order your own listing.' });
    const quantity = safeNumber(req.body.quantity); if (!Number.isFinite(quantity) || quantity <= 0 || (listing.category === 'animal' && quantity !== 1) || quantity > listing.availableQuantity) return res.status(400).json({ message: listing.category === 'animal' ? 'Animal quantity must be exactly one.' : 'Order quantity must be positive and within available stock.' });
    const order = await Order.create({ customer: req.user.id, seller: listing.seller, listing: listing._id, itemSnapshot: { title: listing.title, category: listing.category, unitPrice: listing.price, unit: listing.unit }, quantity, totalPrice: Number((quantity * listing.price).toFixed(2)), customerNotes: String(req.body.customerNotes || '').trim() });
    return res.status(201).json({ message: 'Order request submitted for seller confirmation.', order });
  } catch (error) { return next(error); }
};

const listCustomerOrders = async (req, res, next) => { try { const orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 }).populate('seller', 'name').populate('listing', 'title category status').lean(); return res.json({ orders }); } catch (error) { return next(error); } };
const getCustomerOrder = async (req, res, next) => { try { if (!isId(req.params.id)) return res.status(404).json({ message: 'Order not found.' }); const order = await Order.findOne({ _id: req.params.id, customer: req.user.id }).populate('seller', 'name').populate('listing', 'title category status').lean(); if (!order) return res.status(404).json({ message: 'Order not found.' }); return res.json({ order }); } catch (error) { return next(error); } };
const cancelOrder = async (req, res, next) => { try { const order = await Order.findOneAndUpdate({ _id: req.params.id, customer: req.user.id, status: 'pending' }, { $set: { status: 'cancelled' } }, { new: true }); if (!order) return res.status(409).json({ message: 'Only pending orders can be cancelled.' }); return res.json({ message: 'Order cancelled.', order }); } catch (error) { return next(error); } };

const listSellerOrders = async (req, res, next) => { try { const orders = await Order.find({ seller: req.user.id }).sort({ createdAt: -1 }).populate('customer', 'name').populate('listing', 'title category status').lean(); return res.json({ orders }); } catch (error) { return next(error); } };
const sellerOrderAction = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Order not found.' });
    const action = String(req.body.action || '').toLowerCase(); const order = await Order.findOne({ _id: req.params.id, seller: req.user.id }); if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (action === 'reject') { if (order.status !== 'pending') return res.status(409).json({ message: 'Only pending orders can be rejected.' }); order.status = 'rejected'; await order.save(); return res.json({ message: 'Order rejected.', order }); }
    if (action === 'complete') { if (order.status !== 'accepted') return res.status(409).json({ message: 'Only accepted orders can be completed.' }); order.status = 'completed'; await order.save(); return res.json({ message: 'Order marked completed.', order }); }
    if (action !== 'accept' || order.status !== 'pending') return res.status(409).json({ message: 'Only pending orders can be accepted.' });
    const listing = await MarketplaceListing.findOneAndUpdate({ _id: order.listing, seller: req.user.id, status: 'active', availableQuantity: { $gte: order.quantity } }, { $inc: { availableQuantity: -order.quantity }, ...(order.itemSnapshot.category === 'animal' ? { $set: { status: 'sold' } } : {}) }, { new: true });
    if (!listing) return res.status(409).json({ message: 'The listing is no longer available in the requested quantity.' });
    if (listing.category !== 'animal' && listing.availableQuantity === 0) await MarketplaceListing.updateOne({ _id: listing._id, availableQuantity: 0 }, { $set: { status: 'sold' } });
    order.status = 'accepted'; await order.save(); return res.json({ message: 'Order accepted and stock reserved.', order });
  } catch (error) { return next(error); }
};

module.exports = { listListings, listMine, getListing, createListing, updateListing, deleteListing, createOrder, listCustomerOrders, getCustomerOrder, cancelOrder, listSellerOrders, sellerOrderAction };
