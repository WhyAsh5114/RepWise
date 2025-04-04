import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

type ExerciseFeedback = {
	name: string;
	feedbackFunction: (poseData: PoseLandmarkerResult[]) => string[];
};

// Helper function to calculate angle between three points
export const calculateAngle = (
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
	c: { x: number; y: number; z: number }
) => {
	const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
	let angle = Math.abs((radians * 180.0) / Math.PI);
	if (angle > 180.0) angle = 360 - angle;
	return angle;
};

export const exerciseFeedbacks: ExerciseFeedback[] = [
	{
		name: 'Squat',
		feedbackFunction: (poseData) => {
			const feedback: string[] = [];

			// Skip if not enough data points
			if (poseData.length < 10) return ['Not enough data to analyze squat form'];

			if (poseData.length > 50) {
				poseData = poseData.slice(-50);
			}

			// Extract relevant angles throughout the movement
			const kneeAngles: number[] = [];
			const hipAngles: number[] = [];
			const backAngles: number[] = [];
			const kneeDistance: number[] = [];

			poseData.forEach((frame) => {
				if (!frame.landmarks || frame.landmarks.length === 0) return;

				const landmarks = frame.landmarks[0];

				// Get knee angle (right side)
				const rightHip = landmarks[24];
				const rightKnee = landmarks[26];
				const rightAnkle = landmarks[28];

				// Get hip angle (right side)
				const rightShoulder = landmarks[12];

				// Get back angle
				const leftShoulder = landmarks[11];
				const leftHip = landmarks[23];
				const leftKnee = landmarks[25];

				// Measure knee position relative to ankles
				const leftAnkle = landmarks[27];

				if (rightHip && rightKnee && rightAnkle) {
					kneeAngles.push(calculateAngle(rightHip, rightKnee, rightAnkle));
				}

				if (rightShoulder && rightHip && rightKnee) {
					hipAngles.push(calculateAngle(rightShoulder, rightHip, rightKnee));
				}

				if (leftShoulder && leftHip && leftKnee) {
					// Calculate torso angle relative to vertical
					backAngles.push(calculateAngle({ x: leftShoulder.x, y: 0, z: 0 }, leftShoulder, leftHip));
				}

				if (
					rightKnee &&
					leftKnee &&
					rightAnkle &&
					leftAnkle &&
					Math.abs(rightAnkle.x - leftAnkle.x) > 0
				) {
					// Calculate knee distance relative to ankle distance using 3D coordinates
					const kneeWidth = Math.sqrt(
						Math.pow(rightKnee.x - leftKnee.x, 2) +
							Math.pow(rightKnee.y - leftKnee.y, 2) +
							Math.pow(rightKnee.z - leftKnee.z, 2)
					);
					const ankleWidth = Math.sqrt(
						Math.pow(rightAnkle.x - leftAnkle.x, 2) +
							Math.pow(rightAnkle.y - leftAnkle.y, 2) +
							Math.pow(rightAnkle.z - leftAnkle.z, 2)
					);
					kneeDistance.push(kneeWidth / ankleWidth);
				}
			});

			// Find min knee angle to determine squat depth
			const minKneeAngle = Math.min(...kneeAngles);

			// Determine eccentric/concentric phases
			let lowestPointIndex = kneeAngles.indexOf(minKneeAngle);
			if (lowestPointIndex <= 0) lowestPointIndex = Math.floor(kneeAngles.length / 2);

			const eccentricPhaseFrames = lowestPointIndex;
			const concentricPhaseFrames = kneeAngles.length - lowestPointIndex;
			const eccentricConcentricRatio = eccentricPhaseFrames / concentricPhaseFrames;

			// Generate feedback based on analysis

			// 1. Depth feedback
			if (minKneeAngle > 90) {
				feedback.push('Try to squat deeper - aim for thighs parallel to ground or lower');
			} else {
				feedback.push('Your squat depth is good');
			}

			// 2. Knee position feedback
			const minKneeDistance = Math.min(...kneeDistance);
			if (minKneeDistance < 0.6) {
				feedback.push('Keep your knees in line with your toes - avoid knee cave-in');
			}

			// 4. Tempo feedback
			if (eccentricConcentricRatio < 0.6) {
				feedback.push('Lower yourself more slowly - your descent should be controlled');
			} else if (eccentricConcentricRatio > 1.7) {
				feedback.push('Drive up more powerfully during the ascent phase');
			} else {
				feedback.push('Good tempo control between lowering and rising phases');
			}

			// If only depth feedback was good, add positive overall feedback
			if (feedback.length === 1 && feedback[0] === 'Your squat depth is good') {
				feedback.push('Great squat form! Keep it up!');
			}

			return feedback;
		}
	}
];
