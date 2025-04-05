<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import { 
		Send, 
		X, 
		Minimize2, 
		Loader2, 
		AlertTriangle, 
		Bot, 
		User, 
		Trophy, 
		Target, 
		Weight, 
		Ruler, 
		Calendar, 
		Dumbbell,
		CheckCircle2,
		XCircle
	} from 'lucide-svelte';

	type Message = {
		id: string;
		content: string;
		sender: 'user' | 'bot';
		timestamp: Date;
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
	let hasCompletedOnboarding = $state(false);
	let isCheckingOnboarding = $state(true);
	let userOnboardingData = $state<OnboardingModel | null>(null);

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

	// Function to handle the message that contains profile info
	function renderMessage(message: Message) {
		if (message.content.includes('Please confirm your fitness profile:') && userOnboardingData) {
			return (
				<div class="space-y-4">
					<p>{message.content}</p>
					<ProfileCard profile={formatOnboardingDataToProfile(userOnboardingData)} />
				</div>
			);
		}
		return <p>{message.content}</p>;
	}

	function ProfileCard({ profile }: { profile: UserProfile }) {
		function handleConfirm() {
			sendResponseMessage('yes this is correct');
		}
		
		function handleUpdateInfo() {
			sendResponseMessage('no not correct');
		}
		
		return (
			<Card.Root class="mb-4 bg-card/50 backdrop-blur">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<User class="h-5 w-5 text-primary" />
						Your Fitness Profile
					</Card.Title>
					<Card.Description>Please verify your information</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div class="flex items-center gap-2">
							<div class="rounded-full bg-primary/10 p-2">
								<Trophy class="h-4 w-4 text-primary" />
							</div>
							<div class="space-y-1">
								<p class="text-sm text-muted-foreground">Level</p>
								<p class="font-medium">{capitalize(profile.fitnessLevel)}</p>
							</div>
						</div>
						
						<div class="flex items-center gap-2">
							<div class="rounded-full bg-primary/10 p-2">
								<Target class="h-4 w-4 text-primary" />
							</div>
							<div class="space-y-1">
								<p class="text-sm text-muted-foreground">Goal</p>
								<p class="font-medium">{capitalize(profile.fitnessGoal)}</p>
							</div>
						</div>

						<div class="flex items-center gap-2">
							<div class="rounded-full bg-primary/10 p-2">
								<Weight class="h-4 w-4 text-primary" />
							</div>
							<div class="space-y-1">
								<p class="text-sm text-muted-foreground">Weight</p>
								<p class="font-medium">{profile.weight.value}{profile.weight.unit}</p>
							</div>
						</div>

						<div class="flex items-center gap-2">
							<div class="rounded-full bg-primary/10 p-2">
								<Ruler class="h-4 w-4 text-primary" />
							</div>
							<div class="space-y-1">
								<p class="text-sm text-muted-foreground">Height</p>
								<p class="font-medium">{profile.height.value}{profile.height.unit}</p>
							</div>
						</div>
					</div>

					<Separator />

					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<Calendar class="h-4 w-4 text-primary" />
							<span class="text-sm">Training {profile.daysPerWeek} days/week</span>
						</div>
						
						<div class="flex items-start gap-2">
							<Dumbbell class="h-4 w-4 text-primary mt-1" />
							<div class="flex flex-wrap gap-1">
								{#each profile.availableEquipment as equipment}
									<Badge variant="secondary" class="text-xs">{capitalize(equipment)}</Badge>
								{/each}
							</div>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-end gap-2">
					<Button variant="outline" size="sm" onclick={handleUpdateInfo}>
						<XCircle class="mr-2 h-4 w-4" />
						Update Info
					</Button>
					<Button size="sm" onclick={handleConfirm}>
						<CheckCircle2 class="mr-2 h-4 w-4" />
						Confirm
					</Button>
				</Card.Footer>
			</Card.Root>
		);
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

		setTimeout(
			() => {
				const botMessage: Message = {
					id: (Date.now() + 1).toString(),
					content: getBotResponse(sentMessage),
					sender: 'bot',
					timestamp: new Date()
				};

				messages = [...messages, botMessage];
				isLoading = false;

				setTimeout(() => {
					scrollToBottom();
				}, 100);
			},
			1000 + Math.random() * 1000
		);
	}

	function getBotResponse(message: string): string {
		const lowerMessage = message.toLowerCase();

		if (lowerMessage.includes('yes') && lowerMessage.includes('correct')) {
			return "Great! I'll use this information to provide personalized fitness advice. What would you like help with?";
		} else if (lowerMessage.includes('no') && lowerMessage.includes('not correct')) {
			return 'I understand some information might not be accurate. You can update your profile in the settings. In the meantime, how can I assist you?';
		} else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
			return 'Hello there! How can I assist you today?';
		} else if (lowerMessage.includes('help')) {
			return 'I can help with workout plans, nutrition advice, and tracking your fitness progress. What do you need assistance with?';
		} else if (lowerMessage.includes('feature') || lowerMessage.includes('product')) {
			return 'Our app offers personalized workout plans, nutrition tracking, and fitness analytics. Which feature would you like to know more about?';
		} else if (
			lowerMessage.includes('error') ||
			lowerMessage.includes('problem') ||
			lowerMessage.includes('not working')
		) {
			return "I'm sorry to hear you're experiencing issues. Could you provide more details about what's happening so I can help troubleshoot?";
		} else if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
			return "You're welcome! Is there anything else I can help with?";
		}

		return (
			'I understand you\'re asking about "' +
			message +
			'". Based on your fitness profile, I can provide personalized advice on this topic. How can I help specifically?'
		);
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

<!-- Mobile: Sheet for small screens -->
<div class="md:hidden">
	<Sheet.Root bind:open={isOpen}>
		<Sheet.Content side="bottom" class="h-[85vh] rounded-t-xl border-t-2 border-primary/30">
			<div class="flex h-full flex-col">
				<div class="flex items-center justify-between border-b p-3 bg-muted/30">
					<div class="flex items-center gap-2">
						<Avatar class="border border-primary/20">
							<AvatarFallback class="bg-primary text-primary-foreground">
								AI
							</AvatarFallback>
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
					<Button variant="ghost" size="icon" class="h-8 w-8" onclick={toggleChat}>
						<X class="h-4 w-4" />
					</Button>
				</div>

				<ScrollArea class="flex-1">
					<div bind:this={scrollContainer} class="px-3 py-4 space-y-6">
						{#if isCheckingOnboarding}
							<div class="flex h-40 items-center justify-center">
								<div class="text-center">
									<Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
									<p class="text-sm text-muted-foreground">Loading your profile...</p>
								</div>
							</div>
						{:else if !hasCompletedOnboarding}
							<div class="flex flex-col items-center justify-center p-4 text-center">
								<Alert.Root class="mb-4">
									<AlertTriangle class="h-4 w-4 text-amber-500 mb-2" />
									<Alert.AlertTitle>Onboarding Required</Alert.AlertTitle>
									<Alert.AlertDescription>
										To get personalized fitness assistance, we need some information about you and
										your fitness goals.
									</Alert.AlertDescription>
								</Alert.Root>
								<Button onclick={goToOnboarding} class="mt-2 w-full">Complete Onboarding</Button>
							</div>
						{:else}
							<div class="flex flex-col gap-6">
								{#each messages as message (message.id)}
									<div
										class="flex {message.sender === 'user' ? 'justify-end' : 'justify-start'}"
										transition:fly={{ y: 10, duration: 150 }}
									>
										{#if message.sender === 'bot'}
											<Avatar class="h-8 w-8 mr-2 flex-shrink-0 self-end mb-1">
												<AvatarFallback class="bg-primary text-primary-foreground text-xs">
													AI
												</AvatarFallback>
											</Avatar>
										{/if}
										
										<div
											class="{message.sender === 'user'
												? 'bg-primary text-primary-foreground rounded-tl-2xl rounded-bl-2xl rounded-tr-sm'
												: 'bg-muted/80 rounded-tr-2xl rounded-br-2xl rounded-tl-sm'} 
											max-w-[80%] rounded-lg px-4 py-3 text-sm shadow-sm"
										>
											{#if message.sender === 'bot'}
												{renderMessage(message)}
											{:else}
												<p>{message.content}</p>
											{/if}
											<span class="mt-1 block text-right text-xs opacity-70">
												{formatTime(message.timestamp)}
											</span>
										</div>
										
										{#if message.sender === 'user'}
											<Avatar class="h-8 w-8 ml-2 flex-shrink-0 self-end mb-1">
												<AvatarFallback class="bg-secondary text-secondary-foreground text-xs">
													You
												</AvatarFallback>
											</Avatar>
										{/if}
									</div>
								{/each}

								{#if isLoading}
									<div class="flex justify-start" transition:fade>
										<Avatar class="h-8 w-8 mr-2 flex-shrink-0 self-end mb-1">
											<AvatarFallback class="bg-primary text-primary-foreground text-xs">
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
				</ScrollArea>

				<div class="border-t p-3 bg-background/80 backdrop-blur">
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
		</Sheet.Content>
	</Sheet.Root>
</div>

<!-- Desktop chat window -->
{#if isOpen && !isMinimized}
	<div
		class="fixed bottom-20 right-4 z-50 hidden w-96 flex-col rounded-xl border border-primary/20 bg-card shadow-xl md:flex overflow-hidden"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<div class="flex items-center justify-between rounded-t-xl border-b bg-muted/50 p-3 backdrop-blur">
			<div class="flex items-center gap-2">
				<Avatar class="border border-primary/20">
					<AvatarFallback class="bg-primary text-primary-foreground">
						AI
					</AvatarFallback>
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

		<ScrollArea class="h-96 flex-1">
			<div bind:this={scrollContainer} class="px-4 py-4 space-y-6">
				{#if isCheckingOnboarding}
					<div class="flex h-40 items-center justify-center">
						<div class="text-center">
							<Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
							<p class="text-sm text-muted-foreground">Loading your profile...</p>
						</div>
					</div>
				{:else if !hasCompletedOnboarding}
					<div class="flex flex-col items-center justify-center p-4 text-center">
						<Alert.Root class="mb-4">
							<AlertTriangle class="h-4 w-4 text-amber-500 mb-2" />
							<Alert.AlertTitle>Onboarding Required</Alert.AlertTitle>
							<Alert.AlertDescription>
								To get personalized fitness assistance, we need some information about you and your
								fitness goals.
							</Alert.AlertDescription>
						</Alert.Root>
						<Button onclick={goToOnboarding} class="mt-2 w-full">Complete Onboarding</Button>
					</div>
				{:else}
					<div class="flex flex-col gap-6">
						{#each messages as message (message.id)}
							<div
								class="flex {message.sender === 'user' ? 'justify-end' : 'justify-start'}"
								transition:fly={{ y: 10, duration: 150 }}
							>
								{#if message.sender === 'bot'}
									<Avatar class="h-8 w-8 mr-2 flex-shrink-0 self-end mb-1">
										<AvatarFallback class="bg-primary text-primary-foreground text-xs">
											AI
										</AvatarFallback>
									</Avatar>
								{/if}
								
								<div
									class="{message.sender === 'user'
										? 'bg-primary text-primary-foreground rounded-tl-2xl rounded-bl-2xl rounded-tr-sm'
										: 'bg-muted/80 rounded-tr-2xl rounded-br-2xl rounded-tl-sm'} 
									max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-sm"
								>
									{#if message.sender === 'bot'}
										{renderMessage(message)}
									{:else}
										<p>{message.content}</p>
									{/if}
									<span class="mt-1 block text-right text-xs opacity-70">
										{formatTime(message.timestamp)}
									</span>
								</div>
								
								{#if message.sender === 'user'}
									<Avatar class="h-8 w-8 ml-2 flex-shrink-0 self-end mb-1">
										<AvatarFallback class="bg-secondary text-secondary-foreground text-xs">
											You
										</AvatarFallback>
									</Avatar>
								{/if}
							</div>
						{/each}

						{#if isLoading}
							<div class="flex justify-start" transition:fade>
								<Avatar class="h-8 w-8 mr-2 flex-shrink-0 self-end mb-1">
									<AvatarFallback class="bg-primary text-primary-foreground text-xs">
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
		</ScrollArea>

		<div class="border-t p-3 bg-background/80 backdrop-blur">
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
	<div
		class="fixed bottom-20 right-4 z-50 hidden md:block"
		transition:fly={{ y: 10, duration: 200 }}
	>
		<Badge variant="outline" class="cursor-pointer bg-card shadow-md hover:bg-muted transition-colors duration-200" onclick={toggleChat}>
			<span class="flex items-center gap-2">
				<Bot class="h-3 w-3" />
				Chat minimized
			</span>
		</Badge>
	</div>
{/if}