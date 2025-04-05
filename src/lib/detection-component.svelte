<script lang="ts">
	import {
		DrawingUtils,
		FilesetResolver,
		PoseLandmarker,
		type PoseLandmarkerResult
	} from '@mediapipe/tasks-vision';
	import { LoaderCircle } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Button from './components/ui/button/button.svelte';
	import { exerciseFeedbacks } from './exercise-feedback';
	import { cn } from './utils';

	type PropsType = {
		timer: number;
		exerciseName: string;
		selectedCamera: string;
		inputSource: 'webcam' | 'file';
		videoFile: File | null;
	};

	let { timer, exerciseName, selectedCamera, inputSource, videoFile }: PropsType = $props();
	let poseLandmarker: PoseLandmarker | undefined = $state();

	let videoSrc = $state<string>();
	let videoElement = $state<HTMLVideoElement>();
	let canvasElement = $state<HTMLCanvasElement>();
	let stream = $state<MediaStream | null>(null);
	let lastVideoTime = -1;
	let poseSequence = $state<PoseLandmarkerResult[]>();
	let feedbackMessages = $state<string[]>([]);
	let feedbackScore = $state<number>(0);
	let scoreHistory = $state<number[]>([]);
	let lastVoiceFeedbackTime = 0;

	// Function to calculate weighted average score - gives more weight to recent scores
	function calculateAverageScore(scores: number[]): number {
		if (scores.length === 0) return 0;
		if (scores.length === 1) return scores[0];

		// Apply weighted average - more recent scores get higher weight
		let totalWeight = 0;
		let weightedSum = 0;

		for (let i = 0; i < scores.length; i++) {
			// Linear weighting: newer scores get higher weights
			const weight = i + 1;
			weightedSum += scores[i] * weight;
			totalWeight += weight;
		}

		return Math.round(weightedSum / totalWeight);
	}

	// Throttled function to speak the latest feedback
	async function speakLatestFeedback() {
		const now = Date.now();
		// Throttle to once every 5 seconds
		if (now - lastVoiceFeedbackTime >= 5000 && feedbackMessages.length > 0) {
			lastVoiceFeedbackTime = now;
			const latestFeedback = feedbackMessages[feedbackMessages.length - 1];
			toast.info(latestFeedback);

			try {
				// Create an AbortController with a timeout
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

				const response = await fetch('/api/voice', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: latestFeedback }),
					signal: controller.signal
				});

				clearTimeout(timeoutId); // Clear timeout if fetch completes

				if (response.ok) {
					const audioBlob = await response.blob();
					const audioUrl = URL.createObjectURL(audioBlob);
					const audio = new Audio(audioUrl);

					audio.onended = () => {
						URL.revokeObjectURL(audioUrl); // Clean up when done
					};

					await audio.play().catch((err) => {
						console.error('Error playing audio:', err);
					});
				} else {
					console.error('Voice API error response:', response.status);
					const errorText = await response.text();
					console.error('Error details:', errorText);
				}
			} catch (error) {
				console.error('Failed to speak feedback:', error);
				// Reset the feedback time if there was an error so we can try again sooner
				lastVoiceFeedbackTime = now - 4000;
			}
		}
	}

	// Effect to watch for feedback changes
	$effect(() => {
		if (feedbackMessages.length > 0) {
			speakLatestFeedback();
		}
	});

	onMount(() => {
		loadLandmarker();
		if (inputSource === 'webcam') {
			startWebcam();
		} else if (inputSource === 'file' && videoFile) {
			loadVideoFile();
		}

		return () => {
			if (stream) {
				stopWebcam();
			}
			if (videoSrc) {
				URL.revokeObjectURL(videoSrc);
			}
		};
	});

	function startTimer() {
		const interval = setInterval(() => {
			if (timer > 0) timer -= 1;
			else {
				clearInterval(interval);
				startAnalysis();
			}
		}, 1000);
	}

	async function loadLandmarker() {
		try {
			const vision = await FilesetResolver.forVisionTasks(
				'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
			);

			poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath: '/pose_landmarker_heavy.task',
					delegate: 'GPU'
				},
				runningMode: 'VIDEO'
			});

			startTimer();
		} catch (error) {
			toast.error('Failed to load pose detection model');
			console.error('Error loading model:', error);
		}
	}

	async function startWebcam() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { deviceId: selectedCamera, width: 1280, height: 720 }
			});
			if (videoElement) {
				videoElement.srcObject = stream;
				videoSrc = ''; // Clear any existing video source
			}
		} catch (error) {
			toast.error('Failed to access webcam');
			console.error('Error accessing webcam:', error);
		}
	}

	function loadVideoFile() {
		if (videoFile) {
			if (stream) {
				stopWebcam(); // Stop any active webcam stream
			}

			videoSrc = URL.createObjectURL(videoFile);
			if (videoElement) {
				videoElement.srcObject = null;
				videoElement.load();
			}
		}
	}

	function stopWebcam() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
			if (videoElement) {
				videoElement.srcObject = null;
			}
		}
	}

	function stopAnalysis() {
		if (inputSource === 'webcam') {
			stopWebcam();
		} else if (videoElement) {
			videoElement.pause();
		}

		// Show final feedback
		if (poseSequence && poseSequence.length > 0) {
			const feedback = exerciseFeedbacks.find((f) => f.name === exerciseName);
			if (feedback) {
				const result = feedback.feedbackFunction(poseSequence);
				feedbackMessages = result.feedbacks;

				// Add final score to history and calculate average
				scoreHistory.push(result.score);
				feedbackScore = calculateAverageScore(scoreHistory);
			}
		}
	}

	function startAnalysis() {
		if (!videoElement || !canvasElement) return;
		poseSequence = [];
		feedbackMessages = [];
		feedbackScore = 0;
		scoreHistory = [];
		lastVoiceFeedbackTime = 0;

		const canvasCtx = canvasElement.getContext('2d')!;
		const drawingUtils = new DrawingUtils(canvasCtx);

		let startTimeMs = performance.now();
		let lastPoseAddedTime = startTimeMs;

		// Update canvas dimensions to match video
		canvasElement.width = videoElement.videoWidth;
		canvasElement.height = videoElement.videoHeight;

		// Start playing the video file if we're using a file input
		if (inputSource === 'file' && videoElement) {
			videoElement.play();
		}

		function predictVideo() {
			if (!videoElement || !canvasElement || !poseLandmarker) return;

			if (lastVideoTime !== videoElement.currentTime) {
				lastVideoTime = videoElement.currentTime;
				const currentTimeMs = performance.now();

				poseLandmarker.detectForVideo(videoElement, currentTimeMs, (result) => {
					// Only add pose to sequence at 0.1s intervals
					if (result.worldLandmarks[0] && currentTimeMs - lastPoseAddedTime >= 100) {
						poseSequence?.push(result);
						lastPoseAddedTime = currentTimeMs;

						// Update feedback periodically with current data
						if (poseSequence && poseSequence.length % 10 === 0) {
							const feedback = exerciseFeedbacks.find((f) => f.name === exerciseName);
							if (feedback) {
								const result = feedback.feedbackFunction(poseSequence);
								feedbackMessages = result.feedbacks;

								// Add score to history and update with average
								scoreHistory.push(result.score);

								// Keep only the last 5 scores to be more responsive to recent changes
								if (scoreHistory.length > 5) {
									scoreHistory = scoreHistory.slice(-5);
								}

								feedbackScore = calculateAverageScore(scoreHistory);
							}
						}
					}

					canvasCtx.save();
					canvasCtx.clearRect(0, 0, canvasElement!.width, canvasElement!.height);
					for (const landmark of result.landmarks) {
						drawingUtils.drawLandmarks(landmark, {
							radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
						});
						drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
					}
					canvasCtx.restore();
				});
			}

			// Continue the animation loop if video is still playing
			if (
				(inputSource === 'webcam' && stream) ||
				(inputSource === 'file' && !videoElement.ended && !videoElement.paused)
			) {
				window.requestAnimationFrame(predictVideo);
			} else if (inputSource === 'file' && videoElement.ended) {
				// Video ended, show final results
				stopAnalysis();
			}
		}

		predictVideo();
	}
</script>

{#if !poseLandmarker}
	<div class="flex h-px w-full grow flex-col items-center justify-center gap-2">
		<LoaderCircle class="animate-spin" size={48} />
		<p>Loading model</p>
	</div>
{:else if timer > 0}
	<div class="flex h-px grow flex-col items-center justify-center gap-2">
		<p>Starting in</p>
		<p class="text-4xl font-bold">{timer}</p>
	</div>
{/if}

<div class={cn('grid gap-2', { hidden: timer !== 0 })}>
	<video
		class={cn('col-start-1 row-start-1 w-full', { hidden: !videoSrc && !stream })}
		muted
		bind:this={videoElement}
		src={videoSrc}
		autoplay={inputSource === 'webcam'}
		playsinline
	>
		<track kind="captions" />
	</video>
	<canvas
		bind:this={canvasElement}
		class={cn('col-start-1 row-start-1 w-full', { hidden: !videoSrc && !stream })}
	></canvas>

	{#if feedbackMessages.length > 0}
		<div class="my-4 rounded-md border bg-muted p-4">
			<div class="flex justify-between items-center mb-2">
				<h3 class="text-lg font-semibold">Form Feedback:</h3>
				<div class="flex flex-col items-end">
					<div class="text-xl font-bold">Score: {feedbackScore}/100</div>
					<div class="text-xs text-muted-foreground">Based on {scoreHistory.length} measurement{scoreHistory.length !== 1 ? 's' : ''}</div>
				</div>
			</div>
			<ul class="list-disc space-y-1 pl-5">
				{#each feedbackMessages as message}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<Button onclick={stopAnalysis}>Stop analysis</Button>
</div>
