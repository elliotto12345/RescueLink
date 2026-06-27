const online = new Map();

function setOnline(userId, role = "user") {
  if (userId != null) {
    online.set(String(userId), role);
  }
}

function setOffline(userId) {
  if (userId != null) {
    online.delete(String(userId));
  }
}

function isMechanicOnline(userId) {
  return online.get(String(userId)) === "mechanic";
}

function getOnlineMechanicIds() {
  const ids = [];
  for (const [id, role] of online.entries()) {
    if (role === "mechanic") {
      ids.push(id);
    }
  }
  return ids;
}

module.exports = {
  setOnline,
  setOffline,
  isMechanicOnline,
  getOnlineMechanicIds,
};
