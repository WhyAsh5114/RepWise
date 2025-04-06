<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Send, X, Minimize2, Loader2, AlertTriangle, Bot } from 'lucide-svelte';

	type Message = {
		id: string;
		content: string;
		timestamp: Date;
		sender: 'user' | 'bot';
	};

	type OnboardingModel = {
		id: string;
		age: number;
		userId: string;
		weight: number;
		height: number;
		gender: string;
		injuries: string;
		fitnessGoal: string;
		daysPerWeek: number;
		fitnessLevel: string;
		availableEquipment: string[];
	};

	interface UserProfile {
		fitnessLevel: string;
		fitnessGoal: string;
		age: number;
		gender: string;
		weight: {
			value: number;
			unit: string;
		};
		height: {
			value: number;
			unit: string;
		};
		daysPerWeek: number;
		availableEquipment: string[];
	}

	let isOpen = $state(false);
	let isMinimized = $state(false);
	let isCheckingOnboarding = $state(true);
	let hasCompletedOnboarding = $state(false);
	let userOnboardingData = $state<OnboardingModel | null>(null);
	type WorkoutPlan = {
		fitness_level: string;
		plan_name: string;
		general_guidelines: string;
		weekly_schedule: {
			day: string;
			focus: string;
			exercises: {
				name: string;
				sets: number;
				reps: string;
				load: string;
				rest: string;
				tips: string;
			}[];
			cooldown: string;
		}[];
		days_per_week: number;
	};

	let workoutplanData = $state<WorkoutPlan | null>(null);
	$inspect(workoutplanData);

	let messages = $state<Message[]>([
		{
			id: '1',
			content: 'Hello! How can I help you today?',
			sender: 'bot',
			timestamp: new Date()
		}
	]);

	let inputMessage = $state('');
	let isLoading = $state(false);
	let scrollContainer = $state<HTMLElement | null>(null);

	onMount(async () => {
		fetchOnboardingStatus();
	});

	function formatOnboardingDataToProfile(data: OnboardingModel): UserProfile {
		return {
			fitnessLevel: data.fitnessLevel,
			fitnessGoal: data.fitnessGoal,
			age: data.age,
			gender: data.gender,
			weight: {
				value: data.weight,
				unit: 'kg'
			},
			height: {
				value: data.height,
				unit: 'cm'
			},
			daysPerWeek: data.daysPerWeek,
			availableEquipment: data.availableEquipment
		};
	}

	function generateProfileSummary(profile: UserProfile): string {
		return `Please confirm your fitness profile:`;
	}

	function capitalize(str: string) {
		return str
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function renderMessage(message: Message) {
		if (message.content.includes('Please confirm your fitness profile:') && userOnboardingData) {
			return `
      <div class="space-y-4">
        <p>${message.content}</p>
        ${ProfileCard(formatOnboardingDataToProfile(userOnboardingData))}
      </div>
    `;
		} else if (message.content.includes("Here's your personalized workout plan")) {
			try {
				const startIndex = message.content.indexOf('{');
				const endIndex = message.content.lastIndexOf('}') + 1;

				// Extract the JSON string from the message
				const workoutPlanJson = message.content.slice(startIndex, endIndex);

				// Parse the JSON to get the workoutPlan object
				const workoutPlanData = JSON.parse(workoutPlanJson);
				workoutplanData = workoutPlanData;

				// Return just the intro text, the component will be rendered separately
				return `<p>Here's your personalized workout plan based on your profile:</p>`;
			} catch (error) {
				console.error('Error parsing workout plan:', error);
				return message.content;
			}
		}
		return message.content;
	}

	function WorkoutPlan({ workoutPlan }: { workoutPlan: WorkoutPlan }) {
		function capitalize(str: string) {
			return str
				.split('_')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}

		return `
    <div class="w-full bg-card rounded-lg border shadow-sm overflow-hidden">
      <div class="p-4 border-b bg-muted/30">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <h3 class="text-xl font-bold">${workoutPlan.plan_name}</h3>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                ${capitalize(workoutPlan.fitness_level)} Level
              </span>
              <span class="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${workoutPlan.days_per_week} days/week
              </span>
            </div>
          </div>
          <div class="rounded-full bg-primary/10 p-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6.5 6.5h11M6.5 17.5h11M17.5 6.5v11M6.5 6.5v11"/>
              <path d="M3 22h7V2H3zM14 22h7V2h-7z"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="p-4 space-y-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            General Guidelines
          </div>
          <p class="whitespace-pre-line text-sm">${workoutPlan.general_guidelines}</p>
        </div>

        <div class="h-px bg-border"></div>

        <div class="w-full">
          ${workoutPlan.weekly_schedule
						.map(
							(day, dayIndex) => `
              <div class="border-b last:border-0" data-day-index="${dayIndex}">
                <button class="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline focus:outline-none" data-state="closed">
                  <div class="flex items-center gap-4">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                      ${dayIndex + 1}
                    </div>
                    <div>
                      <span class="font-medium">${day.day}</span>
                      <span class="ml-2 inline-flex items-center rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-medium">
                        ${day.focus}
                      </span>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 transition-transform duration-200">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div class="space-y-4 p-4 hidden bg-muted/5" data-content>
                  <div class="grid gap-4">
                    ${day.exercises
											.map(
												(exercise, index) => `
                        <div class="rounded-lg border bg-card p-4 transition-all hover:shadow-md">
                          <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                              <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                                ${index + 1}
                              </div>
                              <h4 class="font-medium">${exercise.name}</h4>
                            </div>
                            <span class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              ${exercise.load}
                            </span>
                          </div>
                          <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
                            <div class="flex flex-col">
                              <span class="text-muted-foreground text-xs">Sets</span>
                              <span class="font-medium">${exercise.sets}</span>
                            </div>
                            <div class="flex flex-col">
                              <span class="text-muted-foreground text-xs">Reps</span>
                              <span class="font-medium">${exercise.reps}</span>
                            </div>
                            <div class="flex flex-col">
                              <span class="text-muted-foreground text-xs">Rest</span>
                              <span class="font-medium">${exercise.rest}</span>
                            </div>
                          </div>
                          ${
														exercise.tips
															? `
                          <div class="mt-3 flex items-start gap-2 rounded-md bg-secondary/10 p-2 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 text-secondary-foreground mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 16v-4M12 8h.01"/>
                            </svg>
                            <span>${exercise.tips}</span>
                          </div>
                          `
															: ''
													}
                        </div>
                      `
											)
											.join('')}
                  </div>
                  <div class="rounded-lg bg-muted/30 p-3 text-sm">
                    <div class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                      <span class="font-medium">Cooldown:</span>
                    </div>
                    <p class="mt-1 pl-6">${day.cooldown}</p>
                  </div>
                </div>
              </div>
              `
						)
						.join('')}
        </div>
      </div>
    </div>
  `;
	}

	function ProfileCard(profile: UserProfile) {
		return `
			<div class="mb-4 bg-card/50 backdrop-blur rounded-lg border shadow-sm">
				<div class="border-b p-4">
					<div class="flex items-center gap-2">
						<div class="rounded-full bg-primary/10 p-2">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
							</svg>
						</div>
						<div>
							<h3 class="font-medium">Your Fitness Profile</h3>
							<p class="text-sm text-muted-foreground">Current Information</p>
						</div>
					</div>
				</div>

				<div class="p-4 space-y-6">
					<div class="grid gap-4 md:grid-cols-2">
						<div class="flex items-center gap-3">
							<div class="rounded-full bg-primary/10 p-2.5">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M6 9v12m12-12v12M12 6a4 4 0 0 0-4 4v10m8-10v10M12 3l4 3-4 3-4-3z"/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Fitness Level</p>
								<p class="font-medium">${capitalize(profile.fitnessLevel)}</p>
							</div>
						</div>
						
						<div class="flex items-center gap-3">
							<div class="rounded-full bg-primary/10 p-2.5">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10"/>
									<circle cx="12" cy="12" r="6"/>
									<circle cx="12" cy="12" r="2"/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Fitness Goal</p>
								<p class="font-medium">${capitalize(profile.fitnessGoal)}</p>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<div class="rounded-full bg-primary/10 p-2.5">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 4h6v2H9V4z"/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Weight</p>
								<p class="font-medium">${profile.weight.value} ${profile.weight.unit}</p>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<div class="rounded-full bg-primary/10 p-2.5">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M19 17h2M19 21V3M12 21V3M5 21V3M3 17h4M3 7h4M17 17h4M17 7h4"/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Height</p>
								<p class="font-medium">${profile.height.value} ${profile.height.unit}</p>
							</div>
						</div>
					</div>

					<div class="border-t pt-4 space-y-4">
						<div class="flex items-center gap-3">
							<div class="rounded-full bg-primary/10 p-2.5">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
									<line x1="16" y1="2" x2="16" y2="6"/>
									<line x1="8" y1="2" x2="8" y2="6"/>
									<line x1="3" y1="10" x2="21" y2="10"/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Training Schedule</p>
								<p class="font-medium">${profile.daysPerWeek} days per week</p>
							</div>
						</div>
						
						<div class="flex items-start gap-3">
							<div class="rounded-full bg-primary/10 p-2.5">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M3 17h2.5l1-1v-4l-1-1H3v6zM19 17h2v-6h-2.5l-1 1v4l1 1z"/>
									<path d="M6.5 17h11M6.5 7h11M8 17v-4M16 17v-4M7 7v4M17 7v4"/>
								</svg>
							</div>
							<div class="flex-1">
								<p class="text-xs text-muted-foreground mb-2">Available Equipment</p>
								<div class="flex flex-wrap gap-1.5">
									${profile.availableEquipment
										.map(
											(equipment) => `
											<span class="inline-flex items-center rounded-full bg-secondary/50 px-2.5 py-0.5 text-xs font-medium">
												${capitalize(equipment)}
											</span>`
										)
										.join('')}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	async function fetchOnboardingStatus() {
		try {
			const res = await fetch('/api/dashboard');
			if (res.ok) {
				const data = await res.json();
				if (data && data.age) {
					hasCompletedOnboarding = true;
					userOnboardingData = data;

					const profile = formatOnboardingDataToProfile(data);
					messages = [
						{
							id: '1',
							content: generateProfileSummary(profile),
							sender: 'bot',
							timestamp: new Date()
						}
					];
				} else {
					hasCompletedOnboarding = false;
				}
			} else {
				hasCompletedOnboarding = false;
			}
		} catch (error) {
			console.error('Error fetching onboarding status:', error);
			hasCompletedOnboarding = false;
		}
		isCheckingOnboarding = false;
	}

	function goToOnboarding() {
		goto('/onboarding');
		toggleChat();
	}

	function toggleChat() {
		if (isMinimized) {
			isMinimized = false;
			return;
		}
		isOpen = !isOpen;
	}

	function minimizeChat() {
		isMinimized = true;
	}

	function sendResponseMessage(text: string) {
		inputMessage = text;
		sendMessage();
	}

	async function getBotResponse(message: string): Promise<string> {
		try {
			const userData = {
				fitnessLevel: userOnboardingData?.fitnessLevel || 'intermediate',
				fitnessGoal: userOnboardingData?.fitnessGoal || 'muscle gain',
				age: userOnboardingData?.age || 32,
				gender: userOnboardingData?.gender || 'male',
				weight: {
					value: userOnboardingData?.weight || 75,
					unit: 'kg'
				},
				height: {
					value: userOnboardingData?.height || 180,
					unit: 'cm'
				},
				daysPerWeek: userOnboardingData?.daysPerWeek || 4,
				availableEquipment: userOnboardingData?.availableEquipment || [
					'dumbbells',
					'barbell',
					'bench',
					'pull-up bar',
					'resistance bands'
				]
			};

			// Call the workout plan API
			const response = await fetch('/api/workout-plan', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(userData)
			});

			if (!response.ok) {
				throw new Error('Failed to generate workout plan');
			}

			const data = await response.json();

			return `Here's your personalized workout plan based on your fitness profile:
			${WorkoutPlan(data)}`;
		} catch (error) {
			console.error('Error generating workout plan:', error);
			return 'I apologize, but I encountered an error while creating your workout plan. Would you like to try again?';
		}
	}

	async function sendMessage() {
		if (!inputMessage.trim() || !hasCompletedOnboarding) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			content: inputMessage,
			sender: 'user',
			timestamp: new Date()
		};

		messages = [...messages, userMessage];
		const sentMessage = inputMessage;
		inputMessage = '';

		setTimeout(() => {
			scrollToBottom();
		}, 100);

		isLoading = true;

		try {
			const botResponse = await getBotResponse(sentMessage);

			const botMessage: Message = {
				id: (Date.now() + 1).toString(),
				content: botResponse,
				sender: 'bot',
				timestamp: new Date()
			};

			messages = [...messages, botMessage];
		} catch (error) {
			console.error('Error getting bot response:', error);
			messages = [
				...messages,
				{
					id: (Date.now() + 1).toString(),
					content: 'I apologize, but I encountered an error. Please try again.',
					sender: 'bot',
					timestamp: new Date()
				}
			];
		} finally {
			isLoading = false;
			setTimeout(() => {
				scrollToBottom();
			}, 100);
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	function scrollToBottom() {
		if (scrollContainer) {
			scrollContainer.scrollTo({
				top: scrollContainer.scrollHeight,
				behavior: 'smooth'
			});
		}
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	$effect(() => {
		if (messages.length > 0 && !isCheckingOnboarding) {
			scrollToBottom();
		}
	});
</script>

<!-- Chat button fixed at bottom right -->
<div class="fixed bottom-4 right-4 z-50">
	<Button
		onclick={toggleChat}
		variant={isLoading ? 'outline' : 'default'}
		size="icon"
		class="h-14 w-14 rounded-full shadow-lg transition-all hover:scale-105 {isLoading
			? 'animate-pulse'
			: ''}"
	>
		{#if isLoading}
			<Loader2 class="size-6 animate-spin" />
		{:else}
			<Bot class="size-6" />
		{/if}

		{#if !isOpen && messages.length > 1 && !isMinimized}
			<Badge
				class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
				variant="destructive"
			>
				{messages.filter((m) => m.sender === 'bot' && m.id !== '1').length}
			</Badge>
		{/if}
	</Button>
</div>

<!-- Desktop chat window -->
{#if isOpen && !isMinimized}
	<div
		class="fixed bottom-20 right-4 z-50 w-96 flex-col overflow-hidden rounded-xl border border-primary/20 bg-card shadow-xl md:flex"
		in:fly={{ y: 20, duration: 200 }}
	>
		<div
			class="flex items-center justify-between rounded-t-xl border-b bg-muted/50 p-3 backdrop-blur"
		>
			<div class="flex items-center gap-2">
				<Avatar class="border border-primary/20">
					<AvatarFallback class="bg-primary text-primary-foreground">AI</AvatarFallback>
				</Avatar>
				<div>
					<h3 class="text-sm font-medium">Fitness Assistant</h3>
					<p class="text-xs text-muted-foreground">
						<span class="inline-flex items-center">
							<span class="mr-1.5 h-2 w-2 rounded-full bg-green-500"></span>
							Online
						</span>
					</p>
				</div>
			</div>
			<div class="flex gap-1">
				<Button variant="ghost" size="icon" class="h-8 w-8" onclick={minimizeChat}>
					<Minimize2 class="h-4 w-4" />
				</Button>
				<Button variant="ghost" size="icon" class="h-8 w-8" onclick={toggleChat}>
					<X class="h-4 w-4" />
				</Button>
			</div>
		</div>

		<div class="relative flex-1">
			<div
				bind:this={scrollContainer}
				class="scrollbar-container h-[calc(100vh-12rem)] overflow-y-auto px-4 py-4 md:h-[500px]"
			>
				<div class="space-y-6">
					{#if isCheckingOnboarding}
						<div class="flex h-40 items-center justify-center">
							<div class="text-center">
								<Loader2 class="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
								<p class="text-sm text-muted-foreground">Loading your profile...</p>
							</div>
						</div>
					{:else if !hasCompletedOnboarding}
						<div class="flex flex-col items-center justify-center p-4 text-center">
							<Alert.Root class="mb-4">
								<AlertTriangle class="mb-2 h-4 w-4 text-amber-500" />
								<Alert.Title>Onboarding Required</Alert.Title>
								<Alert.Description>
									To get personalized fitness assistance, we need some information about you and
									your fitness goals.
								</Alert.Description>
							</Alert.Root>
							<Button onclick={goToOnboarding} class="mt-2 w-full">Complete Onboarding</Button>
						</div>
					{:else}
						<div class="flex flex-col gap-6">
							{#each messages as message (message.id)}
								<div
									class="flex {message.sender === 'user' ? 'justify-end' : 'justify-start'}"
									in:fly={{ y: 10, duration: 150 }}
								>
									{#if message.sender === 'bot'}
										<Avatar class="mb-1 mr-2 h-8 w-8 flex-shrink-0 self-end">
											<AvatarFallback class="bg-primary text-xs text-primary-foreground">
												AI
											</AvatarFallback>
										</Avatar>
									{/if}

									<div
										class="{message.sender === 'user'
											? 'rounded-bl-2xl rounded-tl-2xl rounded-tr-sm bg-primary text-primary-foreground'
											: 'rounded-br-2xl rounded-tl-sm rounded-tr-2xl bg-muted/80'} 
				max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-sm"
									>
										{#if message.sender === 'bot'}
											{@html renderMessage(message)}
										{:else}
											<p>{message.content}</p>
										{/if}
										<span class="mt-1 block text-right text-xs opacity-70">
											{formatTime(message.timestamp)}
										</span>
									</div>

									{#if message.sender === 'user'}
										<Avatar class="mb-1 ml-2 h-8 w-8 flex-shrink-0 self-end">
											<AvatarFallback class="bg-secondary text-xs text-secondary-foreground">
												You
											</AvatarFallback>
										</Avatar>
									{/if}
								</div>
							{/each}

							{#if isLoading}
								<div class="flex justify-start" in:fade>
									<Avatar class="mb-1 mr-2 h-8 w-8 flex-shrink-0 self-end">
										<AvatarFallback class="bg-primary text-xs text-primary-foreground">
											AI
										</AvatarFallback>
									</Avatar>
									<div class="max-w-[80%] rounded-lg bg-muted/80 px-4 py-3 shadow-sm">
										<div class="flex items-center gap-1">
											<span class="h-2 w-2 animate-pulse rounded-full bg-primary"></span>
											<span
												class="h-2 w-2 animate-pulse rounded-full bg-primary"
												style="animation-delay: 0.2s"
											></span>
											<span
												class="h-2 w-2 animate-pulse rounded-full bg-primary"
												style="animation-delay: 0.4s"
											></span>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="border-t bg-background/80 p-3 backdrop-blur">
			<form onsubmit={sendMessage} class="flex gap-2">
				<Input
					bind:value={inputMessage}
					onkeydown={handleKeyPress}
					placeholder="Type your message..."
					class="flex-1 border-primary/20 focus-visible:ring-primary/30"
					disabled={!hasCompletedOnboarding || isCheckingOnboarding}
				/>
				<Button
					type="submit"
					size="icon"
					disabled={!inputMessage.trim() ||
						isLoading ||
						!hasCompletedOnboarding ||
						isCheckingOnboarding}
					class="bg-primary hover:bg-primary/90"
				>
					<Send class="h-4 w-4" />
				</Button>
			</form>
		</div>
	</div>
{:else if isMinimized}
	<div class="fixed bottom-20 right-4 z-50 hidden md:block" in:fly={{ y: 10, duration: 200 }}>
		<Badge
			variant="outline"
			class="cursor-pointer bg-card shadow-md transition-colors duration-200 hover:bg-muted"
			onclick={toggleChat}
		>
			<span class="flex items-center gap-2">
				<Bot class="h-3 w-3" />
				Chat minimized
			</span>
		</Badge>
	</div>
{/if}

<style>
	/* Enhanced scrollbar styling */
	.scrollbar-container {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--primary) / 0.3) transparent;
	}

	.scrollbar-container::-webkit-scrollbar {
		width: 6px;
	}

	.scrollbar-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.scrollbar-container::-webkit-scrollbar-thumb {
		background-color: hsl(var(--primary) / 0.2);
		border-radius: 20px;
	}

	.scrollbar-container::-webkit-scrollbar-thumb:hover {
		background-color: hsl(var(--primary) / 0.3);
	}
</style>
