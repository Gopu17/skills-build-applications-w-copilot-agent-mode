import { Schema, model } from 'mongoose';

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    mascot: {
      type: String,
      required: [true, 'Team mascot is required'],
      trim: true,
    },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      validate: {
        validator(value: Array<string | Schema.Types.ObjectId>) {
          return Array.isArray(value);
        },
        message: 'Team members must be an array',
      },
    },
  },
  {
    timestamps: true,
  },
);

export const Team = model('Team', teamSchema);
