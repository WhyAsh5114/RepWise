export type UserData = {
	fitnessLevel: string;
	fitnessGoal: string;
	age: number;
	gender: string;
	weight: number;
	height: number;
	daysPerWeek: number;
	availableEquipment: string[];
	injuries?: string;
	workoutDuration?: number;
	preferredExerciseTypes?: string[];
};

export type UserProfile = {
	fitnessLevel: string;
	primaryGoal: string;
	trainingDays: number;
	equipment: string[];
};

export type ExerciseSet = {
	name: string;
	prescription: string;
	notes: string;
};

export type DailySchedule = {
	day: number;
	focus: string;
	warmup: string[];
	mainSets: ExerciseSet[];
	cooldown: string[];
};

export type Exercise = {
	target: string;
	instructions: string;
	variations: string[];
};

export type ProgressionPeriod = {
	focus: string;
	progression: string;
};

export type ProgressionPlan = {
	weeks1to4: ProgressionPeriod;
	weeks5to8: ProgressionPeriod;
	weeks9to12: ProgressionPeriod;
	nextSteps: string;
};

export type WorkoutPlan = {
	userProfile: UserProfile;
	summary: string;
	weeklySchedule: DailySchedule[];
	exercises: Record<string, Exercise>;
	nutritionTips: string[];
	progressionPlan: ProgressionPlan;
};

export type WorkoutModifications = {
	adjustDifficulty?: 'easier' | 'harder' | 'same';
	focusAreas?: string[];
	excludedExercises?: string[];
	newEquipment?: string[];
	changedDaysPerWeek?: number;
};

export type GeminiResponse = {
	response?: string;
	generations?: Array<{
		text: string;
	}>;
};
