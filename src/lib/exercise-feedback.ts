import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

type ExerciseFeedback = {
	name: string;
	feedbackFunction: (poseData: PoseLandmarkerResult[]) => { feedbacks: string[]; score: number };
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
			if (poseData.length < 10)
				return { feedbacks: ['Not enough data to analyze squat form'], score: 0 };

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

			// Initialize score components
			let depthScore = 0;
			let kneeAlignmentScore = 0;
			let hipKneeBalanceScore = 0;
			let tempoScore = 0;

			// 1. Depth feedback
			if (minKneeAngle > 90) {
				negativeFeedback.push('Try to squat deeper - aim for thighs parallel to ground or lower');
				depthScore = Math.max(0, 25 - Math.min(25, (minKneeAngle - 90) / 2));
			} else {
				positiveFeedback.push('Your squat depth is good');
				depthScore = 25;
			}

			// 2. Knee position feedback
			const minKneeDistance = Math.min(...kneeDistance);
			if (minKneeDistance < 0.6) {
				negativeFeedback.push('Keep your knees in line with your toes - avoid knee cave-in');
				kneeAlignmentScore = Math.max(0, 25 * (minKneeDistance / 0.6));
			} else {
				positiveFeedback.push('Good knee alignment throughout the movement');
				kneeAlignmentScore = 25;
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
				hipKneeBalanceScore = 15;
			} else if (kneeFlexionAmount > hipFlexionAmount * 1.5) {
				negativeFeedback.push('Good knee flexion, but engage your hips more for balanced movement');
				hipKneeBalanceScore = 15;
			} else {
				positiveFeedback.push('Good balance between knee and hip movement');
				hipKneeBalanceScore = 25;
			}

			// 4. Tempo feedback
			if (eccentricConcentricRatio < 0.6) {
				negativeFeedback.push('Lower yourself more slowly - your descent should be controlled');
				tempoScore = Math.max(0, 25 * (eccentricConcentricRatio / 0.6));
			} else if (eccentricConcentricRatio > 1.8) {
				negativeFeedback.push('Drive up more powerfully during the ascent phase');
				tempoScore = Math.max(0, 25 * (1.8 / eccentricConcentricRatio));
			} else {
				positiveFeedback.push('Good tempo control between lowering and rising phases');
				tempoScore = 25;
			}

			// Calculate total score out of 100
			const totalScore = Math.round(
				depthScore + kneeAlignmentScore + hipKneeBalanceScore + tempoScore
			);

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
				return { feedbacks: allFeedback, score: totalScore };
			} else {
				return { feedbacks: ['Unable to properly analyze squat form'], score: 0 };
			}
		}
	},
	{
		name: 'Push Up',
		feedbackFunction: (poseData) => {
			const positiveFeedback: string[] = [];
			const negativeFeedback: string[] = [];

			// Skip if not enough data points
			if (poseData.length < 10)
				return { feedbacks: ['Not enough data to analyze push up form'], score: 0 };

			if (poseData.length > 50) {
				poseData = poseData.slice(-50);
			}

			// Extract relevant angles throughout the movement
			const elbowAngles: number[] = [];
			const shoulderAlignment: number[] = [];
			const bodyAlignment: number[] = [];
			const wristShoulderDistances: number[] = [];

			poseData.forEach((frame) => {
				if (!frame.landmarks || frame.landmarks.length === 0) return;

				const landmarks = frame.landmarks[0];

				// Get key points for push-up analysis
				const rightShoulder = landmarks[12];
				const rightElbow = landmarks[14];
				const rightWrist = landmarks[16];
				const rightHip = landmarks[24];
				const leftShoulder = landmarks[11];
				const leftElbow = landmarks[13];
				const leftWrist = landmarks[15];
				const leftHip = landmarks[23];
				const nose = landmarks[0];

				// Measure elbow angle (average of both sides if available)
				if (rightShoulder && rightElbow && rightWrist) {
					const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
					elbowAngles.push(rightElbowAngle);
				} else if (leftShoulder && leftElbow && leftWrist) {
					const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
					elbowAngles.push(leftElbowAngle);
				}

				// Measure body alignment (back should be straight)
				if (rightShoulder && rightHip && rightElbow) {
					const backAngle = calculateAngle(
						{ x: rightShoulder.x, y: rightShoulder.y - 1, z: rightShoulder.z },
						rightShoulder,
						rightHip
					);
					bodyAlignment.push(Math.abs(180 - backAngle)); // Deviation from straight line
				} else if (leftShoulder && leftHip && leftElbow) {
					const backAngle = calculateAngle(
						{ x: leftShoulder.x, y: leftShoulder.y - 1, z: leftShoulder.z },
						leftShoulder,
						leftHip
					);
					bodyAlignment.push(Math.abs(180 - backAngle)); // Deviation from straight line
				}

				// Measure shoulder alignment with head (to detect shrugging or sinking)
				if (rightShoulder && nose) {
					const shoulderHeadAngle = calculateAngle(
						{ x: rightShoulder.x + 1, y: rightShoulder.y, z: rightShoulder.z },
						rightShoulder,
						nose
					);
					shoulderAlignment.push(shoulderHeadAngle);
				} else if (leftShoulder && nose) {
					const shoulderHeadAngle = calculateAngle(
						{ x: leftShoulder.x - 1, y: leftShoulder.y, z: leftShoulder.z },
						leftShoulder,
						nose
					);
					shoulderAlignment.push(shoulderHeadAngle);
				}

				// Measure hand position relative to shoulders
				if (rightShoulder && rightWrist) {
					const distance = Math.sqrt(
						Math.pow(rightShoulder.x - rightWrist.x, 2) + 
						Math.pow(rightShoulder.z - rightWrist.z, 2)
					);
					wristShoulderDistances.push(distance);
				} else if (leftShoulder && leftWrist) {
					const distance = Math.sqrt(
						Math.pow(leftShoulder.x - leftWrist.x, 2) + 
						Math.pow(leftShoulder.z - leftWrist.z, 2)
					);
					wristShoulderDistances.push(distance);
				}
			});

			// Find min elbow angle to determine push-up depth
			const minElbowAngle = Math.min(...elbowAngles);
			
			// Determine eccentric/concentric phases
			let lowestPointIndex = elbowAngles.indexOf(minElbowAngle);
			if (lowestPointIndex <= 0) lowestPointIndex = Math.floor(elbowAngles.length / 2);

			const eccentricPhaseFrames = lowestPointIndex;
			const concentricPhaseFrames = elbowAngles.length - lowestPointIndex;
			const eccentricConcentricRatio = eccentricPhaseFrames / concentricPhaseFrames;

			// Initialize score components
			let depthScore = 0;
			let alignmentScore = 0;
			let armPositionScore = 0;
			let tempoScore = 0;

			// 1. Depth feedback
			if (minElbowAngle > 90) {
				negativeFeedback.push('Aim for deeper push-ups - try to reach a 90° angle at your elbows');
				depthScore = Math.max(0, 25 - Math.min(25, (minElbowAngle - 90) / 2));
			} else if (minElbowAngle < 70) {
				negativeFeedback.push('Your push-ups may be too deep - aim for around 90° at your elbows to protect your shoulders');
				depthScore = Math.max(0, 25 - Math.min(25, (70 - minElbowAngle) * 2));
			} else {
				positiveFeedback.push('Your push-up depth is excellent');
				depthScore = 25;
			}

			// 2. Body alignment feedback
			const maxAlignmentDeviation = Math.max(...bodyAlignment);
			if (maxAlignmentDeviation > 15) {
				negativeFeedback.push('Keep your body in a straight line - avoid sagging or raising your hips');
				alignmentScore = Math.max(0, 25 * (1 - (maxAlignmentDeviation - 15) / 25));
			} else {
				positiveFeedback.push('Good body alignment throughout the push-up');
				alignmentScore = 25;
			}

			// 3. Hand position feedback
			const avgWristShoulderDistance = wristShoulderDistances.reduce((sum, val) => sum + val, 0) / wristShoulderDistances.length;
			// Normalize by some factor - this would need calibration
			const normalizedDistance = avgWristShoulderDistance * 2; // Arbitrary scaling factor
			
			if (normalizedDistance < 0.8) {
				negativeFeedback.push('Your hand position appears too narrow - place hands slightly wider than shoulders');
				armPositionScore = Math.max(0, 25 * (normalizedDistance / 0.8));
			} else if (normalizedDistance > 1.5) {
				negativeFeedback.push('Your hand position appears too wide - bring hands closer for better chest engagement');
				armPositionScore = Math.max(0, 25 * (1.5 / normalizedDistance));
			} else {
				positiveFeedback.push('Good hand positioning relative to shoulders');
				armPositionScore = 25;
			}

			// 4. Tempo feedback
			if (eccentricConcentricRatio < 0.6) {
				negativeFeedback.push('Lower yourself more slowly - control the descent phase');
				tempoScore = Math.max(0, 25 * (eccentricConcentricRatio / 0.6));
			} else if (eccentricConcentricRatio > 1.8) {
				negativeFeedback.push('Push up more powerfully in the rising phase');
				tempoScore = Math.max(0, 25 * (1.8 / eccentricConcentricRatio));
			} else {
				positiveFeedback.push('Good tempo control between lowering and rising phases');
				tempoScore = 25;
			}

			// Calculate total score
			const totalScore = Math.round(depthScore + alignmentScore + armPositionScore + tempoScore);

			// Return all feedback, with positive first and negative last
			const allFeedback = [...positiveFeedback];

			// Add excellence message if no negative feedback
			if (negativeFeedback.length === 0 && positiveFeedback.length > 0) {
				allFeedback.push('Excellent push-up form across all aspects! Keep up the great work!');
			}

			// Add negative feedback at the end
			allFeedback.push(...negativeFeedback);

			// Return combined feedback or default message if no feedback
			if (allFeedback.length > 0) {
				return { feedbacks: allFeedback, score: totalScore };
			} else {
				return { feedbacks: ['Unable to properly analyze push-up form'], score: 0 };
			}
		}
	}
];
