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
			const positiveFeedback: string[] = [];
			const negativeFeedback: string[] = [];

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
				negativeFeedback.push('Try to squat deeper - aim for thighs parallel to ground or lower');
			} else {
				positiveFeedback.push('Your squat depth is good');
			}

			// 2. Knee position feedback
			const minKneeDistance = Math.min(...kneeDistance);
			if (minKneeDistance < 0.6) {
				negativeFeedback.push('Keep your knees in line with your toes - avoid knee cave-in');
			} else {
				positiveFeedback.push('Good knee alignment throughout the movement');
			}

			// 3. Hip dominance feedback
			const initialKneeAngle = kneeAngles[0] || 180;
			const initialHipAngle = hipAngles[0] || 180;
			const minHipAngle = Math.min(...hipAngles);

			// Calculate flexion amounts (change from starting position)
			const kneeFlexionAmount = initialKneeAngle - minKneeAngle;
			const hipFlexionAmount = initialHipAngle - minHipAngle;

			// Check if hip flexion is significantly greater than knee flexion
			if (hipFlexionAmount > kneeFlexionAmount * 1.3) {
				negativeFeedback.push(
					'Focus on bending your knees more - your squat appears to be hip-dominant'
				);
			} else if (kneeFlexionAmount > hipFlexionAmount * 1.5) {
				negativeFeedback.push('Good knee flexion, but engage your hips more for balanced movement');
			} else {
				positiveFeedback.push('Good balance between knee and hip movement');
			}

			// 4. Tempo feedback
			if (eccentricConcentricRatio < 0.6) {
				negativeFeedback.push('Lower yourself more slowly - your descent should be controlled');
			} else if (eccentricConcentricRatio > 1.8) {
				negativeFeedback.push('Drive up more powerfully during the ascent phase');
			} else {
				positiveFeedback.push('Good tempo control between lowering and rising phases');
			}

			// Return all feedback, with positive first and negative last
			const allFeedback = [...positiveFeedback];

			// Add the excellence message if there's no negative feedback
			if (negativeFeedback.length === 0 && positiveFeedback.length > 0) {
				allFeedback.push('Excellent squat form across all aspects! Keep up the great work!');
			}

			// Add negative feedback at the end
			allFeedback.push(...negativeFeedback);

			// Return combined feedback or default message if no feedback
			if (allFeedback.length > 0) {
				return allFeedback;
			} else {
				return ['Unable to properly analyze squat form'];
			}
		}
	}
];
