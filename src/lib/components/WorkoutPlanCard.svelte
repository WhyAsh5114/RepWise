<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Dumbbell, Info, Calendar } from 'lucide-svelte';
	import * as Accordion from '$lib/components/ui/accordion';

	export let workoutPlan: {
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

	function capitalize(str: string): string {
		return str
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<Card.Root class="w-full">
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<Card.Title class="text-xl font-bold">{workoutPlan.plan_name}</Card.Title>
				<Card.Description>
					<div class="flex items-center gap-2">
						<Badge variant="secondary">{capitalize(workoutPlan.fitness_level)} Level</Badge>
						<Badge variant="outline">
							<Calendar class="mr-1 h-3 w-3" />
							{workoutPlan.days_per_week} days/week
						</Badge>
					</div>
				</Card.Description>
			</div>
			<div class="rounded-full bg-primary/10 p-3">
				<Dumbbell class="h-6 w-6 text-primary" />
			</div>
		</div>
	</Card.Header>

	<Card.Content class="space-y-6">
		<div class="space-y-2">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<Info class="h-4 w-4" />
				General Guidelines
			</div>
			<p class="whitespace-pre-line text-sm">{workoutPlan.general_guidelines}</p>
		</div>

		<Separator />

		<Accordion.Root class="w-full" type="single">
			{#each workoutPlan.weekly_schedule as day}
				<Accordion.Item value={day.day}>
					<Accordion.Trigger>
						<div class="flex items-center gap-4">
							<span class="font-medium">{day.day}</span>
							<Badge variant="outline">{day.focus}</Badge>
						</div>
					</Accordion.Trigger>
					<Accordion.Content>
						<div class="space-y-4 p-4">
							<div class="grid gap-4">
								{#each day.exercises as exercise}
									<div class="rounded-lg border bg-card p-4">
										<div class="flex items-center justify-between">
											<h4 class="font-medium">{exercise.name}</h4>
											<Badge>{exercise.load}</Badge>
										</div>
										<div class="mt-2 grid grid-cols-3 gap-2 text-sm text-muted-foreground">
											<div>
												<span class="font-medium">Sets:</span>
												{exercise.sets}
											</div>
											<div>
												<span class="font-medium">Reps:</span>
												{exercise.reps}
											</div>
											<div>
												<span class="font-medium">Rest:</span>
												{exercise.rest}
											</div>
										</div>
										{#if exercise.tips}
											<p class="mt-2 text-xs text-muted-foreground">💡 {exercise.tips}</p>
										{/if}
									</div>
								{/each}
							</div>
							<div class="rounded-lg bg-muted/50 p-3 text-sm">
								<span class="font-medium">Cooldown:</span>
								{day.cooldown}
							</div>
						</div>
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</Card.Content>
</Card.Root>
