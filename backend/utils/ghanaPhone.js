function normalizeGhanaPhone(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (digits.startsWith("233") && digits.length >= 12) {
    local = `0${digits.slice(3, 12)}`;
  } else if (digits.startsWith("0") && digits.length >= 10) {
    local = digits.slice(0, 10);
  } else if (digits.length === 9) {
    local = `0${digits}`;
  } else {
    return null;
  }

  if (!/^0[235]\d{8}$/.test(local)) return null;

  return {
    local,
    international: `233${local.slice(1)}`,
    display: local,
  };
}

function momoProvider(localPhone) {
  const prefix = String(localPhone || "").slice(0, 3);
  if (["024", "025", "053", "054", "055", "059"].includes(prefix)) return "mtn";
  if (["020", "050"].includes(prefix)) return "vod";
  if (["026", "027", "056", "057"].includes(prefix)) return "atl";
  return null;
}

module.exports = { normalizeGhanaPhone, momoProvider };
