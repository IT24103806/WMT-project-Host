const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED"
};

const APPOINTMENT_POINTS = 50;
const REVIEW_POINTS = 20;
const REFERRAL_POINTS = 100;

const BADGE_DEFINITIONS = [
  {
    key: "first_appointment",
    title: "First Appointment",
    description: "Complete your first appointment",
    metric: "completedAppointments",
    target: 1
  },
  {
    key: "regular_customer",
    title: "Regular Customer",
    description: "Complete 5 appointments",
    metric: "completedAppointments",
    target: 5
  },
  {
    key: "vip",
    title: "VIP",
    description: "Complete 10 appointments",
    metric: "completedAppointments",
    target: 10
  },
  {
    key: "reviewer",
    title: "Reviewer",
    description: "Submit 5 reviews",
    metric: "reviewsSubmitted",
    target: 5
  },
  {
    key: "social_butterfly",
    title: "Social Butterfly",
    description: "Refer 3 friends",
    metric: "referralsCompleted",
    target: 3
  }
];

const numberOrZero = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
};

const getUserId = (user) => String(user?.id || user?._id || "");

const getAppointmentOwnerId = (appointment) => {
  const owner = appointment?.userId || appointment?.customerId || appointment?.customer;
  if (typeof owner === "string") return owner;
  return String(owner?._id || owner?.id || "");
};

const getFeedbackOwnerId = (feedback) => {
  const owner = feedback?.customerId || feedback?.userId || feedback?.customer;
  if (typeof owner === "string") return owner;
  return String(owner?._id || owner?.id || "");
};

const parseAppointmentDateTime = (appointment) => {
  const dateValue = String(appointment?.date || appointment?.appointmentDate || "").trim();
  if (!dateValue) return null;
  const timeValue = String(appointment?.time || "23:59").trim();
  const normalizedTime = /AM|PM/i.test(timeValue) ? timeValue : `${timeValue} PM`;
  const parsed = new Date(`${dateValue} ${normalizedTime}`);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(dateValue);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const isCompletedAppointment = (appointment) => {
  const status = String(appointment?.status || "").trim().toLowerCase();
  if (["completed", "complete", "done"].includes(status)) return true;
  if (status !== "approved") return false;

  const dateTime = parseAppointmentDateTime(appointment);
  return dateTime ? dateTime.getTime() <= Date.now() : false;
};

export const normalizeAccountStatus = (user) => {
  const explicitStatus = String(user?.accountStatus || user?.status || "").trim().toUpperCase();
  if (Object.values(ACCOUNT_STATUS).includes(explicitStatus)) return explicitStatus;

  if (user?.isActive === false) return ACCOUNT_STATUS.SUSPENDED;

  const approval = String(user?.staffApprovalStatus || user?.approvalStatus || "")
    .trim()
    .toLowerCase();
  const role = String(user?.role || "").trim().toLowerCase();
  if (role === "staff" || role === "beautician") {
    if (["pending", "pending_approval"].includes(approval)) return ACCOUNT_STATUS.PENDING_APPROVAL;
    if (["rejected", "declined"].includes(approval)) return ACCOUNT_STATUS.REJECTED;
  }

  return ACCOUNT_STATUS.ACTIVE;
};

export const getAccountStatusMeta = (status) => {
  const normalized = Object.values(ACCOUNT_STATUS).includes(status) ? status : ACCOUNT_STATUS.ACTIVE;
  const meta = {
    [ACCOUNT_STATUS.ACTIVE]: {
      label: "Active",
      tone: "success",
      message: "Your account is active."
    },
    [ACCOUNT_STATUS.PENDING_APPROVAL]: {
      label: "Pending Approval",
      tone: "warning",
      message: "Your beautician account is waiting for admin approval. Staff actions are restricted."
    },
    [ACCOUNT_STATUS.REJECTED]: {
      label: "Rejected",
      tone: "danger",
      message: "Your beautician account was not approved. Staff actions are restricted."
    },
    [ACCOUNT_STATUS.SUSPENDED]: {
      label: "Suspended",
      tone: "danger",
      message: "Your account is suspended. Please contact the salon administrator."
    }
  };
  return meta[normalized];
};

export const enrichUserManagementData = (user = {}) => {
  if (!user) return user;
  const accountStatus = normalizeAccountStatus(user);
  const userId = getUserId(user);
  const fallbackCodeSource = `${user?.name || "SALON"}${userId || user?.email || ""}`
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  const fallbackReferralCode = `SX${(fallbackCodeSource || "MEMBER").slice(0, 8)}`;

  return {
    ...user,
    accountStatus,
    referralCode: user.referralCode || user.referral?.code || fallbackReferralCode
  };
};

export const buildUserManagementSummary = ({ user, appointments = [], feedbacks = [] }) => {
  const enrichedUser = enrichUserManagementData(user || {});
  const userId = getUserId(enrichedUser);

  const userAppointments = appointments.filter((appointment) => {
    if (!userId) return true;
    const ownerId = getAppointmentOwnerId(appointment);
    return !ownerId || ownerId === userId;
  });

  const completedAppointmentIds = new Set(
    userAppointments
      .filter(isCompletedAppointment)
      .map((appointment) => String(appointment?._id || appointment?.id || appointment?.appointmentNumber || ""))
      .filter(Boolean)
  );

  const userFeedbacks = feedbacks.filter((feedback) => {
    if (!userId) return true;
    const ownerId = getFeedbackOwnerId(feedback);
    return !ownerId || ownerId === userId;
  });
  const reviewIds = new Set(
    userFeedbacks
      .map((feedback) => String(feedback?._id || feedback?.id || feedback?.appointmentId?._id || feedback?.appointmentId || ""))
      .filter(Boolean)
  );

  const referralSource =
    enrichedUser.referralStats ||
    enrichedUser.referrals ||
    enrichedUser.referral ||
    enrichedUser.referralSummary ||
    {};
  const referralsCompleted = numberOrZero(
    referralSource.completed ||
      referralSource.completedCount ||
      referralSource.successful ||
      referralSource.successfulCount ||
      enrichedUser.referralsCompleted
  );

  const backendLoyaltyPoints = enrichedUser.loyaltyPoints ?? enrichedUser.points ?? enrichedUser.rewards?.loyaltyPoints;
  const derivedLoyaltyPoints =
    completedAppointmentIds.size * APPOINTMENT_POINTS +
    reviewIds.size * REVIEW_POINTS +
    referralsCompleted * REFERRAL_POINTS;

  const metrics = {
    accountStatus: enrichedUser.accountStatus,
    loyaltyPoints: numberOrZero(backendLoyaltyPoints ?? derivedLoyaltyPoints),
    referralCode: enrichedUser.referralCode,
    referredBy: enrichedUser.referredBy || enrichedUser.referral?.referredBy || "",
    referralsCompleted,
    referralRewards: numberOrZero(referralSource.rewardPoints || referralSource.rewards || referralsCompleted * REFERRAL_POINTS),
    completedAppointments: numberOrZero(enrichedUser.completedAppointments ?? completedAppointmentIds.size),
    reviewsSubmitted: numberOrZero(enrichedUser.reviewsSubmitted ?? reviewIds.size),
    loginCount: numberOrZero(enrichedUser.loginCount),
    lastLoginAt: enrichedUser.lastLoginAt || enrichedUser.lastLogin || ""
  };

  const badges = BADGE_DEFINITIONS.map((badge) => {
    const current = numberOrZero(metrics[badge.metric]);
    const earned = current >= badge.target;
    return {
      ...badge,
      current,
      earned,
      progress: badge.target ? Math.min(1, current / badge.target) : 0,
      remaining: Math.max(0, badge.target - current)
    };
  });

  return {
    user: enrichedUser,
    metrics: {
      ...metrics,
      badgesEarned: badges.filter((badge) => badge.earned).length
    },
    badges,
    earnedBadges: badges.filter((badge) => badge.earned),
    nextBadge: badges.find((badge) => !badge.earned) || null,
    rewardRules: {
      appointmentPoints: APPOINTMENT_POINTS,
      reviewPoints: REVIEW_POINTS,
      referralPoints: REFERRAL_POINTS
    }
  };
};

export const isRestrictedBeauticianAccount = (user) => {
  const role = String(user?.role || "").toLowerCase();
  return role === "staff" && normalizeAccountStatus(user) !== ACCOUNT_STATUS.ACTIVE;
};

