const express = require("express");
const router = express.Router();

// In-memory mechanics for now
let mechanics = [
  {
    id: 1,
    name: "Kwame Mensah",
    phone: "+233 24 123 4567",
    rating: 4.8,
    jobs: 120,
    latitude: 5.6037,
    longitude: -0.187,
    available: true,
    verified: true,
  },
  {
    id: 2,
    name: "Kofi Agyeman",
    phone: "+233 20 987 6543",
    rating: 4.6,
    jobs: 85,
    latitude: 5.6145,
    longitude: -0.205,
    available: true,
    verified: true,
  },
];

// Get all mechanics
router.get("/", (req, res) => {
  res.json({ mechanics });
});

// Get nearby mechanics
router.get("/nearby", (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Location required" });
  }

  // Simple distance calculation
  const nearby = mechanics
    .filter((m) => m.available && m.verified)
    .map((m) => {
      const distance = Math.sqrt(
        Math.pow(m.latitude - parseFloat(latitude), 2) +
          Math.pow(m.longitude - parseFloat(longitude), 2),
      );
      return { ...m, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  res.json({ mechanics: nearby });
});

// Update mechanic availability
router.put("/:id/availability", (req, res) => {
  const { available } = req.body;
  const mechanic = mechanics.find((m) => m.id === parseInt(req.params.id));

  if (!mechanic) {
    return res.status(404).json({ error: "Mechanic not found" });
  }

  mechanic.available = available;
  res.json({ message: "Availability updated", mechanic });
});

module.exports = router;
