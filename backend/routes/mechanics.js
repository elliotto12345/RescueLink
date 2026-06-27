const express = require("express");
const router = express.Router();
const onlineUsers = require("../state/onlineUsers");

// In-memory mechanics — legacy fallback
let mechanics = [];

router.get("/", (req, res) => {
  res.json({ mechanics });
});

router.get("/online", (req, res) => {
  res.json({ onlineIds: onlineUsers.getOnlineMechanicIds() });
});

router.get("/nearby", (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Location required" });
  }

  const nearby = mechanics
    .filter((m) => m.available && m.verified)
    .map((m) => {
      const distance = Math.sqrt(
        Math.pow(m.latitude - parseFloat(latitude), 2) +
          Math.pow(m.longitude - parseFloat(longitude), 2),
      );
      return {
        ...m,
        distance,
        online: onlineUsers.isMechanicOnline(m.id),
      };
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
