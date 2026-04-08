const express = require('express');

const router = express.Router();

const products = [
  { id: 1, name: 'Carbon Fiber Pro Rod', description: 'Professional-grade carbon fiber rod for precision casting and superior sensitivity.', price: 149.99, category: 'rods', rating: 5, image: 'https://placehold.co/400x300/0A2540/ffffff?text=Carbon+Fiber+Pro+Rod', inStock: true },
  { id: 2, name: 'Ultralight Spinning Rod', description: 'Lightweight spinning rod perfect for stream and river fishing.', price: 89.99, category: 'rods', rating: 4, image: 'https://placehold.co/400x300/0A2540/ffffff?text=Ultralight+Spinning+Rod', inStock: true },
  { id: 3, name: 'Heavy Action Casting Rod', description: 'Built for big game — heavy action power for casting large lures.', price: 119.99, category: 'rods', rating: 4, image: 'https://placehold.co/400x300/0A2540/ffffff?text=Heavy+Action+Rod', inStock: true },
  { id: 4, name: 'Baitcaster Elite 3000', description: 'High-performance baitcasting reel with magnetic brake system.', price: 129.99, category: 'reels', rating: 5, image: 'https://placehold.co/400x300/4A7A99/ffffff?text=Baitcaster+Elite', inStock: true },
  { id: 5, name: 'Spinning Reel Pro', description: 'Smooth drag system and anti-reverse for dependable hook sets.', price: 79.99, category: 'reels', rating: 4, image: 'https://placehold.co/400x300/4A7A99/ffffff?text=Spinning+Reel+Pro', inStock: true },
  { id: 6, name: 'Fly Reel Classic', description: 'Timeless design with precision machined large arbor spool.', price: 99.99, category: 'reels', rating: 4, image: 'https://placehold.co/400x300/4A7A99/ffffff?text=Fly+Reel+Classic', inStock: true },
  { id: 7, name: 'Deep Diver Crankbait Set (6pc)', description: 'Six versatile crankbaits designed to reach deep structure fish.', price: 24.99, category: 'lures', rating: 5, image: 'https://placehold.co/400x300/C76C3A/ffffff?text=Crankbait+Set', inStock: true },
  { id: 8, name: 'Soft Plastic Worm Pack', description: 'Realistic soft plastics in natural colors — a bass staple.', price: 12.99, category: 'lures', rating: 4, image: 'https://placehold.co/400x300/C76C3A/ffffff?text=Soft+Plastic+Worms', inStock: true },
  { id: 9, name: 'Topwater Frog Lure', description: 'Weedless frog lure for explosive topwater strikes.', price: 9.99, category: 'lures', rating: 4, image: 'https://placehold.co/400x300/C76C3A/ffffff?text=Topwater+Frog', inStock: true },
  { id: 10, name: 'Spinnerbait Assortment', description: 'Multi-blade spinnerbait pack for murky and clear water.', price: 19.99, category: 'lures', rating: 3, image: 'https://placehold.co/400x300/C76C3A/ffffff?text=Spinnerbait+Pack', inStock: true },
  { id: 11, name: 'Braided Line 300yd', description: 'Ultra-strong braided line with zero stretch for sensitivity.', price: 29.99, category: 'line', rating: 5, image: 'https://placehold.co/400x300/0A2540/ffffff?text=Braided+Line', inStock: true },
  { id: 12, name: 'Fluorocarbon Leader 50yd', description: 'Nearly invisible leader material with excellent abrasion resistance.', price: 14.99, category: 'line', rating: 4, image: 'https://placehold.co/400x300/0A2540/ffffff?text=Fluorocarbon+Leader', inStock: true },
  { id: 13, name: 'Premium Tackle Box', description: 'Multi-tray waterproof tackle box with adjustable compartments.', price: 49.99, category: 'tackle', rating: 5, image: 'https://placehold.co/400x300/4A7A99/ffffff?text=Tackle+Box', inStock: true },
  { id: 14, name: 'Hook Assortment Pack', description: '150-piece hook set in various sizes for any fishing scenario.', price: 8.99, category: 'tackle', rating: 4, image: 'https://placehold.co/400x300/4A7A99/ffffff?text=Hook+Pack', inStock: true },
  { id: 15, name: 'Polarized Fishing Sunglasses', description: 'UV400 polarized lenses to cut glare and spot fish below the surface.', price: 39.99, category: 'accessories', rating: 4, image: 'https://placehold.co/400x300/C76C3A/ffffff?text=Sunglasses', inStock: true },
  { id: 16, name: 'Waterproof Phone Case', description: 'IPX8-rated universal phone case for on-the-water protection.', price: 15.99, category: 'accessories', rating: 3, image: 'https://placehold.co/400x300/C76C3A/ffffff?text=Phone+Case', inStock: true },
  { id: 17, name: 'Digital Fish Scale', description: 'Accurate digital scale with backlit display — weighs up to 110 lbs.', price: 22.99, category: 'accessories', rating: 4, image: 'https://placehold.co/400x300/C76C3A/ffffff?text=Fish+Scale', inStock: true },
];

// GET /api/store/products
router.get('/products', (req, res) => {
  res.json({ products });
});

module.exports = router;
