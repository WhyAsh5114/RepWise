<script lang="ts">
	import { format } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import { useSession } from '$lib/auth-client';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import H1 from '$lib/components/typography/h1.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import {
		User,
		Ruler,
		Weight,
		Activity,
		AlertCircle,
		Trophy,
		Target,
		PieChart,
		Info,
		Utensils,
		X
	} from 'lucide-svelte';

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

	interface MacrosData {
		id: string;
		calories: number;
		protein: number;
		fat: number;
		carbs: number;
		rawData: string;
		createdAt?: Date;
	}

	const session = useSession();
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<OnboardingData | null>(null);
	let macrosData = $state<MacrosData[]>([]);
	let selectedMacros = $state<MacrosData | null>(null);
	let showMacrosDialog = $state(false);

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

	async function fetchMacrosData() {
		try {
			const response = await fetch('/api/macros');
			if (!response.ok) throw new Error('Failed to fetch macros data');
			macrosData = await response.json();
		} catch (err) {
			toast.error('Error loading macros data');
		}
	}

	function openMacrosDetails(macros: MacrosData) {
		selectedMacros = macros;
		showMacrosDialog = true;
	}

	$effect(() => {
		if ($session.data?.user) {
			fetchDashboardData();
			fetchMacrosData();
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
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Utensils class="h-5 w-5 text-primary" />
					Nutrition Tracking
				</Card.Title>
				<Card.Description>Recent meals and nutritional information</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if macrosData.length === 0}
					<div
						class="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
					>
						<AlertCircle class="h-5 w-5" />
						<span>No macros data available</span>
					</div>
				{:else}
					<div class="rounded-md border bg-background p-4 shadow-sm">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-12 text-center">Sr. No</Table.Head>
									<Table.Head>Date</Table.Head>
									<Table.Head class="text-right">Calories</Table.Head>
									<Table.Head class="text-right">Protein</Table.Head>
									<Table.Head class="w-16 text-center">Details</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each macrosData as macros, i}
									<Table.Row class="transition-colors hover:bg-muted/50">
										<Table.Cell class="text-center">{i + 1}</Table.Cell>
										<Table.Cell>{format(new Date(), 'MMM dd, yyyy')}</Table.Cell>
										<Table.Cell class="text-right">{macros.calories} kcal</Table.Cell>
										<Table.Cell class="text-right">{macros.protein}g</Table.Cell>
										<Table.Cell class="text-center">
											<Button
												variant="ghost"
												size="icon"
												onclick={() => openMacrosDetails(macros)}
												title="View Details"
											>
												<Info class="h-4 w-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Dialog.Root bind:open={showMacrosDialog}>
			<Dialog.Content class="rounded-lg border bg-background p-6 shadow-lg sm:max-w-[600px]">
				<Dialog.Header class="mb-4 flex items-center justify-between border-b pb-2">
					<Dialog.Title class="flex items-center gap-2 text-lg font-semibold">
						<PieChart class="h-5 w-5 text-primary" />
						Macro Details
					</Dialog.Title>
				</Dialog.Header>
				{#if selectedMacros}
					<div class="space-y-4">
						<div class="flex items-center gap-2">
							<span class="font-medium">Date:</span>
							<span>{format(new Date(), 'MMMM dd, yyyy')}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="font-medium">Calories:</span>
							<span>{selectedMacros.calories} kcal</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="font-medium">Protein:</span>
							<span>{selectedMacros.protein} g</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="font-medium">Carbs:</span>
							<span>{selectedMacros.carbs} g</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="font-medium">Fat:</span>
							<span>{selectedMacros.fat} g</span>
						</div>
					</div>
				{/if}
				<Dialog.Footer class="mt-4 flex justify-end">
					<Button variant="outline" onclick={() => (showMacrosDialog = false)}>Close</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>
