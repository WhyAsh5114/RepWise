<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Dumbbell, Info, Calendar } from 'lucide-svelte';
	import * as Accordion from '$lib/components/ui/accordion';

	type WorkoutPlan = {
		fitness_level: string;
		plan_name: string;
		general_guidelines: string;
		weekly_schedule: Array<{
			day: string;
			focus: string;
			exercises: Array<{
				name: string;
				sets: number;
				reps: string;
				load: string;
				rest: string;
				tips: string;
			}>;
			cooldown: string;
		}>;
		days_per_week: number;
	};

	let { workoutPlan } = $props<{ workoutPlan: WorkoutPlan }>();

	function capitalize(str: string): string {
		return str
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<Card.Root class="w-full overflow-hidden bg-card/95 backdrop-blur-sm border-primary/10">
	<Card.Header class="bg-muted/30">
		<div class="flex items-center justify-between">
			<div class="space-y-1.5">
				<Card.Title class="text-xl font-bold bg-gradient-to-br from-primary to-primary-foreground bg-clip-text text-transparent">
					{workoutPlan.plan_name}
				</Card.Title>
				<Card.Description>
					<div class="flex items-center gap-2">
						<Badge variant="secondary" class="bg-primary/10 text-primary hover:bg-primary/20">
							{capitalize(workoutPlan.fitness_level)} Level
						</Badge>
						<Badge variant="outline" class="gap-1">
							<Calendar class="h-3 w-3" />
							{workoutPlan.days_per_week} days/week
						</Badge>
					</div>
				</Card.Description>
			</div>
			<div class="rounded-full bg-primary/10 p-3 ring-1 ring-primary/20">
				<Dumbbell class="h-6 w-6 text-primary" />
			</div>
		</div>
	</Card.Header>

	<Card.Content class="space-y-6 p-6">
		<div class="space-y-2">
			<div class="flex items-center gap-2 text-sm font-medium text-primary">
				<Info class="h-4 w-4" />
				General Guidelines
			</div>
			<p class="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
				{workoutPlan.general_guidelines}
			</p>
		</div>

		<Separator class="bg-primary/10" />

		<Accordion.Root class="w-full" type="single">
			{#each workoutPlan.weekly_schedule as day}
				<Accordion.Item value={day.day} class="border-primary/10">
					<Accordion.Trigger class="hover:bg-muted/50">
						<div class="flex items-center gap-4">
							<span class="font-medium text-primary">{day.day}</span>
							<Badge variant="outline" class="bg-background/50">{day.focus}</Badge>
						</div>
					</Accordion.Trigger>
					<Accordion.Content>
						<div class="space-y-4 p-4">
							<div class="grid gap-4">
								{#each day.exercises as exercise}
									<div class="rounded-lg border border-primary/10 bg-card/50 p-4 hover:bg-muted/30 transition-colors">
										<div class="flex items-center justify-between">
											<h4 class="font-medium text-primary">{exercise.name}</h4>
											<Badge class="bg-primary/10 text-primary hover:bg-primary/20">{exercise.load}</Badge>
										</div>
										<div class="mt-2 grid grid-cols-3 gap-2 text-sm text-muted-foreground">
											<div>
												<span class="font-medium text-foreground">Sets:</span>
												{exercise.sets}
											</div>
											<div>
												<span class="font-medium text-foreground">Reps:</span>
												{exercise.reps}
											</div>
											<div>
												<span class="font-medium text-foreground">Rest:</span>
												{exercise.rest}
											</div>
										</div>
										{#if exercise.tips}
											<p class="mt-2 text-xs text-muted-foreground">💡 {exercise.tips}</p>
										{/if}
									</div>
								{/each}
							</div>
							<div class="rounded-lg bg-muted/30 p-3 text-sm border border-primary/10">
								<span class="font-medium text-primary">Cooldown:</span>
								<span class="text-muted-foreground"> {day.cooldown}</span>
							</div>
						</div>
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</Card.Content>
</Card.Root>
