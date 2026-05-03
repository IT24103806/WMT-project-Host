const Staff = require("../models/Staff");

const STAFF_PREFIX = "STF";
const CODE_DIGITS = 5;
const CODE_PATTERN = /^STF(\d+)$/i;

const parseStaffCode = (value) => {
  const match = String(value || "").trim().match(CODE_PATTERN);
  if (!match) return 0;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : 0;
};

const formatStaffCode = (num) => `${STAFF_PREFIX}${String(num).padStart(CODE_DIGITS, "0")}`;

const getNextStaffCode = async () => {
  const staffList = await Staff.find().select("staffCode");
  const maxCode = staffList.reduce((max, item) => Math.max(max, parseStaffCode(item.staffCode)), 0);
  return formatStaffCode(maxCode + 1);
};

module.exports = {
  getNextStaffCode
};

