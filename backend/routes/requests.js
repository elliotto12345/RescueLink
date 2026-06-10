const express = require("express");
const router = express.Router();

// In-memory storage for now
let requests = [];

// Create a new request
router.post("/", (req, res) => {
  try {
    const { userId, issue, latitude, longitude, description } = req.body;

    const newRequest = {
      id: Date.now(),
      userId,
      issue,
      latitude,
      longitude,
      description,
      status: "pending",
      mechanic: null,
      createdAt: new Date(),
    };

    requests.push(newRequest);

    res.status(201).json({
      message: "Request created successfully",
      request: newRequest,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get all requests
router.get("/", (req, res) => {
  res.json({ requests });
});

// Get single request
router.get("/:id", (req, res) => {
  const request = requests.find((r) => r.id === parseInt(req.params.id));
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }
  res.json({ request });
});

// Update request status
router.put("/:id/status", (req, res) => {
  const { status, mechanicId } = req.body;
  const request = requests.find((r) => r.id === parseInt(req.params.id));

  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  request.status = status;
  if (mechanicId) request.mechanic = mechanicId;

  res.json({ message: "Status updated", request });
});

module.exports = router;
