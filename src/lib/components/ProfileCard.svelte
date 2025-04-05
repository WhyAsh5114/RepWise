<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Trophy,
		Target,
		Weight,
		Ruler,
		Calendar,
		Dumbbell,
		CheckCircle2,
		XCircle,
		User
	} from 'lucide-svelte';

	interface UserProfile {
		fitnessLevel: string;
		fitnessGoal: string;
		age: number;
		gender: string;
		weight: { value: number; unit: string };
		height: { value: number; unit: string };
		daysPerWeek: number;
		availableEquipment: string[];
	}

	let profile: UserProfile = {
		fitnessLevel: '',
		fitnessGoal: '',
		age: 0,
		gender: '',
		weight: { value: 0, unit: 'kg' },
		height: { value: 0, unit: 'cm' },
		daysPerWeek: 0,
		availableEquipment: []
	};
	export let onConfirm: () => void;
	export let onUpdateInfo: () => void;

	function capitalize(str: string): string {
		return str
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<Card class="shadow-lg">
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<User class="h-5 w-5 text-primary" />
			Your Fitness Profile
		</CardTitle>
		<CardDescription>Verify your information</CardDescription>
	</CardHeader>
	<CardContent class="space-y-4">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div class="flex items-center gap-2">
				<div class="rounded-full bg-primary/10 p-2">
					<Trophy class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Level</p>
					<p class="font-medium">{capitalize(profile.fitnessLevel)}</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="rounded-full bg-primary/10 p-2">
					<Target class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Goal</p>
					<p class="font-medium">{capitalize(profile.fitnessGoal)}</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="rounded-full bg-primary/10 p-2">
					<Weight class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Weight</p>
					<p class="font-medium">{profile.weight.value}{profile.weight.unit}</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="rounded-full bg-primary/10 p-2">
					<Ruler class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Height</p>
					<p class="font-medium">{profile.height.value}{profile.height.unit}</p>
				</div>
			</div>
		</div>
		<Separator />
		<div class="flex flex-col space-y-2">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-primary" />
				<p class="text-sm">Training {profile.daysPerWeek} days/week</p>
			</div>
			<div class="flex items-start gap-2">
				<Dumbbell class="mt-1 h-4 w-4 text-primary" />
				<div class="flex flex-wrap gap-1">
					{#each profile.availableEquipment as equipment}
						<Badge variant="secondary" class="text-xs">{capitalize(equipment)}</Badge>
					{/each}
				</div>
			</div>
			<div class="mt-2">
				<p class="text-sm text-muted-foreground">Age & Gender</p>
				<p class="font-medium">{profile.age} years old, {capitalize(profile.gender)}</p>
			</div>
		</div>
	</CardContent>
	<CardFooter class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={onUpdateInfo}>
			<XCircle class="mr-2 h-4 w-4" />
			Update Info
		</Button>
		<Button size="sm" onclick={onConfirm}>
			<CheckCircle2 class="mr-2 h-4 w-4" />
			Confirm
		</Button>
	</CardFooter>
</Card>
