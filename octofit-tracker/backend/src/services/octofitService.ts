import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  const error = new Error(message) as Error & { status: number };
  error.status = 400;
  return error;
}

function notFound(message: string) {
  const error = new Error(message) as Error & { status: number };
  error.status = 404;
  return error;
}

function normalizeId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    throw badRequest(`${fieldName} is required`);
  }
  const id = String(value);
  if (!mongoose.isValidObjectId(id)) {
    throw badRequest(`${fieldName} is invalid`);
  }
  return id;
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1, createdAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity payload is required');
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const normalizedUserId = normalizeId(userId, 'userId');
  const normalizedTeamId = normalizeId(teamId, 'teamId');
  const normalizedType = String(type ?? '').trim().toLowerCase();
  if (!normalizedType) {
    throw badRequest('Activity type is required');
  }

  const duration = Number(minutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw badRequest('Activity minutes must be greater than zero');
  }

  const user = await User.findById(normalizedUserId);
  if (!user) {
    throw notFound('User not found');
  }

  const team = await Team.findById(normalizedTeamId);
  if (!team) {
    throw notFound('Team not found');
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: normalizedType,
    minutes: duration,
    points: Math.max(1, Math.round(duration)),
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ createdAt: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team payload is required');
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  const normalizedName = String(name ?? '').trim();
  const normalizedMascot = String(mascot ?? '').trim();

  if (!normalizedName) {
    throw badRequest('Team name is required');
  }
  if (!normalizedMascot) {
    throw badRequest('Team mascot is required');
  }

  const memberList = Array.isArray(members) ? members : [members];
  const normalizedMembers = memberList.map((member) => {
    const memberId = normalizeId(member, 'member');
    return memberId;
  });

  const uniqueMemberIds = [...new Set(normalizedMembers)];
  const existingMembers = await User.find({ _id: { $in: uniqueMemberIds } }).select('_id');
  const existingIds = new Set(existingMembers.map((member) => member._id.toString()));
  const missingIds = uniqueMemberIds.filter((memberId) => !existingIds.has(memberId));
  if (missingIds.length > 0) {
    throw notFound(`User not found: ${missingIds[0]}`);
  }

  const team = await Team.create({
    name: normalizedName,
    mascot: normalizedMascot,
    members: uniqueMemberIds.map((memberId) => new mongoose.Types.ObjectId(memberId)),
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const teams = await Team.find().select('_id name').lean();
  const totals = await Activity.aggregate([
    {
      $group: {
        _id: '$team',
        totalPoints: { $sum: '$points' },
      },
    },
  ]);

  const scoreByTeam = new Map<string, number>();
  for (const entry of totals) {
    scoreByTeam.set(String(entry._id), Number(entry.totalPoints ?? 0));
  }

  const leaderboard = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: scoreByTeam.get(String(team._id)) ?? 0,
    }))
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }
      return left.teamName.localeCompare(right.teamName);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return leaderboard;
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = String(userEmail ?? '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw notFound('User not found');
  }

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentFocuses = new Set(
    recentActivity
      .map((activity) => String(activity.type ?? '').trim().toLowerCase())
      .filter(Boolean),
  );
  const preferredFocus = String(user.fitnessGoal ?? '').trim().toLowerCase() || [...recentFocuses][0] || 'general';

  const workouts = await Workout.find().sort({ title: 1 }).lean();

  const suggestions = workouts
    .map((workout) => {
      const focus = String(workout.focus ?? '').trim().toLowerCase();
      const score = Number(focus === preferredFocus) * 3 + Number(recentFocuses.has(focus)) * 2;
      const reason = focus === preferredFocus
        ? `Matches your ${preferredFocus} goal and recent activity.`
        : recentFocuses.has(focus)
          ? `Matches your recent ${[...recentFocuses].join(', ')} activity.`
          : `Builds broader fitness with ${focus} focus.`;
      return { ...workout, focus, score, reason };
    })
    .sort((left, right) => right.score - left.score || Number(left.minutes) - Number(right.minutes))
    .map(({ score, ...workout }) => ({
      title: workout.title,
      focus: workout.focus,
      minutes: workout.minutes,
      difficulty: workout.difficulty,
      reason: workout.reason,
    }));

  return suggestions.length > 0 ? suggestions.slice(0, 3) : [];
}

export { User };
