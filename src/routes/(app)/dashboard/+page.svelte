<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { useSession } from '$lib/auth-client';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import H1 from '$lib/components/typography/h1.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { User, Ruler, Weight, Activity, AlertCircle, Trophy, Target } from 'lucide-svelte';

	type OnboardingData = {
		age: number;
		weight: number;
		height: number;
		gender: string;
		injuries: string;
		fitnessGoal: string;
		daysPerWeek: number;
		fitnessLevel: string;
		availableEquipment: string[];
	};

	const session = useSession();
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<OnboardingData | null>(null);

	const capitalize = (str: string) => {
		if (!str) return '';
		return str
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	};

	async function fetchDashboardData() {
		try {
			const response = await fetch('/api/dashboard');
			if (!response.ok) throw new Error('Failed to fetch dashboard data');
			data = await response.json();
		} catch (err) {
			error = 'Failed to load dashboard data';
			toast.error('Error loading dashboard data');
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if ($session.data?.user) {
			fetchDashboardData();
		}
	});

	const calculateBMI = (weight: number, height: number) => {
		const heightInMeters = height / 100;
		return (weight / (heightInMeters * heightInMeters)).toFixed(1);
	};
</script>

<div class="container space-y-6 py-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="space-y-1">
			<H1>Fitness Dashboard</H1>
			<p class="text-base text-muted-foreground">
				Welcome back, {$session.data?.user?.name}
			</p>
		</div>
		<Button variant="default" href="/form-correction" class="w-full md:w-auto">Start Workout</Button
		>
	</div>

	{#if isLoading}
		<div class="flex min-h-[400px] items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
		</div>
	{:else if error}
		<Card.Root>
			<Card.Content class="flex items-center gap-2 p-4 text-destructive">
				<AlertCircle class="h-5 w-5" />
				{error}
			</Card.Content>
		</Card.Root>
	{:else if data}
		<!-- Stats Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			<!-- Stat Cards -->
			<Card.Root>
				<Card.Content class="flex flex-row items-center justify-between p-6">
					<div class="space-y-1">
						<p class="text-sm font-medium text-muted-foreground">Age</p>
						<div class="flex items-baseline gap-2">
							<p class="text-2xl font-semibold">{data.age}</p>
							<span class="text-sm text-muted-foreground">years</span>
						</div>
					</div>
					<div class="rounded-full bg-primary/10 p-2.5">
						<User class="h-5 w-5 text-primary" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex flex-row items-center justify-between p-6">
					<div class="space-y-1">
						<p class="text-sm font-medium text-muted-foreground">Weight</p>
						<div class="flex items-baseline gap-2">
							<p class="text-2xl font-semibold">{data.weight}</p>
							<span class="text-sm text-muted-foreground">kg</span>
						</div>
					</div>
					<div class="rounded-full bg-primary/10 p-2.5">
						<Weight class="h-5 w-5 text-primary" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex flex-row items-center justify-between p-6">
					<div class="space-y-1">
						<p class="text-sm font-medium text-muted-foreground">Height</p>
						<div class="flex items-baseline gap-2">
							<p class="text-2xl font-semibold">{data.height}</p>
							<span class="text-sm text-muted-foreground">cm</span>
						</div>
					</div>
					<div class="rounded-full bg-primary/10 p-2.5">
						<Ruler class="h-5 w-5 text-primary" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex flex-row items-center justify-between p-6">
					<div class="space-y-1">
						<p class="text-sm font-medium text-muted-foreground">BMI</p>
						<div class="flex items-baseline gap-2">
							<p class="text-2xl font-semibold">{calculateBMI(data.weight, data.height)}</p>
							<span class="text-sm text-muted-foreground">index</span>
						</div>
					</div>
					<div class="rounded-full bg-primary/10 p-2.5">
						<Activity class="h-5 w-5 text-primary" />
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Info Cards -->
		<div class="grid gap-6 md:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Trophy class="h-5 w-5 text-primary" />
						Fitness Profile
					</Card.Title>
					<Card.Description>Your current fitness information and goals</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-6">
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Level</span>
								<span class="font-medium">{capitalize(data.fitnessLevel)}</span>
							</div>
							<Progress
								value={data.fitnessLevel === 'beginner'
									? 33
									: data.fitnessLevel === 'intermediate'
										? 66
										: 100}
								class="h-2"
							/>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Training Days</span>
								<span class="font-medium">{data.daysPerWeek} days/week</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Primary Goal</span>
								<span class="font-medium">{capitalize(data.fitnessGoal)}</span>
							</div>
						</div>

						<div class="space-y-2">
							<p class="text-sm font-medium">Equipment Access</p>
							<div class="flex flex-wrap gap-2">
								{#each data.availableEquipment as equipment}
									<div class="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
										{capitalize(equipment)}
									</div>
								{/each}
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Target class="h-5 w-5 text-primary" />
						Health Information
					</Card.Title>
					<Card.Description>Medical considerations and limitations</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<div class="rounded-lg border p-4">
							<h4 class="mb-2 text-sm font-medium">Injuries & Limitations</h4>
							<p class="text-sm text-muted-foreground">
								{data.injuries || 'No injuries or limitations reported'}
							</p>
						</div>
						<div class="flex items-start gap-2 rounded-lg bg-muted/50 p-4">
							<AlertCircle class="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div class="space-y-1">
								<p class="text-sm font-medium">Health Advisory</p>
								<p class="text-xs text-muted-foreground">
									Always consult with a healthcare professional before starting any new exercise
									program, especially if you have existing medical conditions or injuries.
								</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{:else}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center gap-4 p-6">
				<p class="text-center text-muted-foreground">
					Complete your fitness profile to see your dashboard
				</p>
				<Button href="/onboarding">Complete Profile</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
