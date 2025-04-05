<script lang="ts">
	import {
		Card,
		CardTitle,
		CardFooter,
		CardHeader,
		CardContent,
		CardDescription
	} from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Slider } from '$lib/components/ui/slider';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, Check } from 'lucide-svelte';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Progress } from '$lib/components/ui/progress';
	import * as Select from '$lib/components/ui/select/index.js';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	let gender = $state<string>('');
	let injuries = $state<string>('');
	let daysPerWeek = $state<number>(3);
	let currentStep = $state<number>(1);
	let fitnessGoal = $state<string>('');
	let age = $state<number | null>(null);
	let fitnessLevel = $state<string>('');
	let isSuccess = $state<boolean>(false);
	let weight = $state<number | null>(null);
	let height = $state<number | null>(null);
	let isSubmitting = $state<boolean>(false);
	let availableEquipment = $state<string[]>([]);
	let errors = $state<Record<string, string>>({});

	interface EquipmentOption {
		value: string;
		label: string;
	}
	const equipmentOptions: EquipmentOption[] = [
		{ value: 'none', label: 'None' },
		{ value: 'bench', label: 'Bench' },
		{ value: 'barbell', label: 'Barbell' },
		{ value: 'full_gym', label: 'Full Gym' },
		{ value: 'dumbbells', label: 'Dumbbells' },
		{ value: 'kettlebell', label: 'Kettlebell' },
		{ value: 'pull_up_bar', label: 'Pull-up Bar' },
		{ value: 'resistance_bands', label: 'Resistance Bands' }
	];

	const totalSteps: number = 4;
	const progressPercentage = $derived((currentStep / totalSteps) * 100);

	function toggleEquipment(item: string): void {
		availableEquipment = availableEquipment.includes(item)
			? availableEquipment.filter((i) => i !== item)
			: [...availableEquipment, item];
	}

	function validateCurrentStep(): boolean {
		errors = {};
		let isValid = true;

		if (currentStep === 1) {
			if (!fitnessLevel) {
				errors = { ...errors, fitnessLevel: 'Please select your fitness level' };
				isValid = false;
			}
			if (!fitnessGoal) {
				errors = { ...errors, fitnessGoal: 'Please select your fitness goal' };
				isValid = false;
			}
		} else if (currentStep === 2) {
			if (!age || age < 16 || age > 90) {
				errors = { ...errors, age: 'Age must be between 16 and 90' };
				isValid = false;
			}
			if (!weight || weight <= 0) {
				errors = { ...errors, weight: 'Please enter a valid weight' };
				isValid = false;
			}
			if (!height || height <= 0) {
				errors = { ...errors, height: 'Please enter a valid height' };
				isValid = false;
			}
		} else if (currentStep === 3) {
			if (!gender) {
				errors = { ...errors, gender: 'Please select your gender' };
				isValid = false;
			}
		}

		return isValid;
	}

	function nextStep(): void {
		if (validateCurrentStep() && currentStep < totalSteps) {
			currentStep++;
		}
	}

	function prevStep(): void {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function handleDaysPerWeekChange(value: number): void {
		daysPerWeek = value;
	}

	interface FormData {
		gender: string;
		injuries: string;
		age: number | null;
		fitnessGoal: string;
		daysPerWeek: number;
		fitnessLevel: string;
		weight: number | null;
		height: number | null;
		availableEquipment: string[];
	}

	function getFormData(): FormData {
		return {
			age,
			weight,
			height,
			gender,
			injuries,
			fitnessGoal,
			daysPerWeek,
			fitnessLevel,
			availableEquipment
		};
	}

	async function handleSubmit(): Promise<void> {
		if (!validateCurrentStep()) return;

		isSubmitting = true;
		try {
			console.log('Form submitted:', getFormData());
			const onboarding = getFormData();

			const response = await fetch('/api/onboarding', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ onboarding })
			});

			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const data = await response.text();
			console.log(data);
			isSuccess = true;
			toast.success('Your fitness profile has been created!');
		} catch (error) {
			toast.error('There was an error submitting your form');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="container mx-auto max-w-2xl px-4 py-10">
	<Card class="shadow-lg">
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle class="text-2xl font-bold">Fitness Questionnaire</CardTitle>
					<CardDescription>Create your personalized fitness profile</CardDescription>
				</div>
				<Badge variant="outline" class="text-sm">Step {currentStep} of {totalSteps}</Badge>
			</div>
			<div class="mt-2">
				<Progress value={progressPercentage} class="h-2" />
			</div>
		</CardHeader>

		<CardContent>
			{#if isSuccess}
				<div class="space-y-4 py-10 text-center">
					<div
						class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 p-3"
					>
						<Check class="h-8 w-8 text-green-600" />
					</div>
					<h3 class="text-xl font-medium">Profile Created Successfully!</h3>
					<p class="text-muted-foreground">Your personalized fitness plan is being prepared.</p>
				</div>
			{:else}
				{#if currentStep === 1}
					<div class="space-y-6">
						<div class="space-y-4">
							<h3 class="text-lg font-medium">Fitness Level & Goals</h3>

							<div class="space-y-2">
								<Label for="fitnessLevel">Fitness Level</Label>
								<RadioGroup bind:value={fitnessLevel} class="grid grid-cols-3 gap-2">
									<div>
										<RadioGroupItem id="beginner" value="beginner" class="peer sr-only" />
										<Label
											for="beginner"
											class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
										>
											<span>Beginner</span>
										</Label>
									</div>
									<div>
										<RadioGroupItem id="intermediate" value="intermediate" class="peer sr-only" />
										<Label
											for="intermediate"
											class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
										>
											<span>Intermediate</span>
										</Label>
									</div>
									<div>
										<RadioGroupItem id="advanced" value="advanced" class="peer sr-only" />
										<Label
											for="advanced"
											class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
										>
											<span>Advanced</span>
										</Label>
									</div>
								</RadioGroup>
								{#if errors.fitnessLevel}
									<p class="text-sm text-red-500">{errors.fitnessLevel}</p>
								{/if}
							</div>

							<div class="space-y-2 pt-4">
								<Label for="fitnessGoal">Fitness Goal</Label>
								<Select.Root type="single" onValueChange={(value) => (fitnessGoal = value)}>
									<Select.Trigger id="fitnessGoal" class="w-full">
										{fitnessGoal
											? fitnessGoal
													.split('_')
													.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
													.join(' ')
											: 'Select your primary goal'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="weight_loss">Weight Loss</Select.Item>
										<Select.Item value="muscle_gain">Muscle Gain</Select.Item>
										<Select.Item value="strength">Strength</Select.Item>
										<Select.Item value="endurance">Endurance</Select.Item>
										<Select.Item value="maintenance">Maintenance</Select.Item>
										<Select.Item value="toning">Toning</Select.Item>
									</Select.Content>
								</Select.Root>
								{#if errors.fitnessGoal}
									<p class="text-sm text-red-500">{errors.fitnessGoal}</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				{#if currentStep === 2}
					<div class="space-y-6">
						<div class="space-y-4">
							<h3 class="text-lg font-medium">Physical Attributes</h3>

							<div class="space-y-2">
								<Label for="age">Age (16-90)</Label>
								<Input
									id="age"
									type="number"
									min="16"
									max="90"
									placeholder="Enter your age"
									bind:value={age}
								/>
								{#if errors.age}
									<p class="text-sm text-red-500">{errors.age}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="weight">Weight (kg)</Label>
								<Input
									id="weight"
									type="number"
									min="1"
									step="0.1"
									placeholder="Enter your weight in kg"
									bind:value={weight}
								/>
								{#if errors.weight}
									<p class="text-sm text-red-500">{errors.weight}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="height">Height (cm)</Label>
								<Input
									id="height"
									type="number"
									min="1"
									placeholder="Enter your height in cm"
									bind:value={height}
								/>
								{#if errors.height}
									<p class="text-sm text-red-500">{errors.height}</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				{#if currentStep === 3}
					<div class="space-y-6">
						<div class="space-y-4">
							<h3 class="text-lg font-medium">Gender & Training Schedule</h3>

							<div class="space-y-2">
								<Label for="gender">Gender</Label>
								<RadioGroup bind:value={gender} class="grid grid-cols-3 gap-2">
									<div>
										<RadioGroupItem id="male" value="male" class="peer sr-only" />
										<Label
											for="male"
											class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
										>
											<span>Male</span>
										</Label>
									</div>
									<div>
										<RadioGroupItem id="female" value="female" class="peer sr-only" />
										<Label
											for="female"
											class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
										>
											<span>Female</span>
										</Label>
									</div>
									<div>
										<RadioGroupItem id="other" value="other" class="peer sr-only" />
										<Label
											for="other"
											class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
										>
											<span>Other</span>
										</Label>
									</div>
								</RadioGroup>
								{#if errors.gender}
									<p class="text-sm text-red-500">{errors.gender}</p>
								{/if}
							</div>

							<div class="space-y-2 pt-4">
								<Label for="daysPerWeek">Days Per Week ({daysPerWeek})</Label>
								<Slider
									id="daysPerWeek"
									type="single"
									min={1}
									max={7}
									step={1}
									value={daysPerWeek}
									onValueChange={handleDaysPerWeekChange}
								/>
								<div class="flex justify-between text-xs text-muted-foreground">
									<span>1</span>
									<span>2</span>
									<span>3</span>
									<span>4</span>
									<span>5</span>
									<span>6</span>
									<span>7</span>
								</div>
							</div>
						</div>
					</div>
				{/if}

				{#if currentStep === 4}
					<div class="space-y-6">
						<div class="space-y-4">
							<h3 class="text-lg font-medium">Equipment & Limitations</h3>

							<div class="space-y-2">
								<Label>Available Equipment</Label>
								<div class="grid grid-cols-2 gap-2">
									{#each equipmentOptions as option}
										<Button
											type="button"
											class="justify-start"
											onclick={() => toggleEquipment(option.value)}
											variant={availableEquipment.includes(option.value) ? 'default' : 'outline'}
										>
											{option.label}
										</Button>
									{/each}
								</div>
							</div>

							<div class="space-y-2 pt-4">
								<Label for="injuries">Injuries/Limitations</Label>
								<Textarea
									id="injuries"
									placeholder="Describe any injuries or limitations (e.g., knee problems, lower back pain, etc.)"
									bind:value={injuries}
									rows={4}
								/>
							</div>

							<Alert variant="default" class="border-primary bg-background/50">
								<AlertCircle class="h-4 w-4 text-amber-500" />
								<AlertTitle>Important</AlertTitle>
								<AlertDescription>
									This information will be used to customize your workout plan. If you have severe
									injuries, please consult with a healthcare professional before starting any
									exercise program.
								</AlertDescription>
							</Alert>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>

		{#if !isSuccess}
			<CardFooter class="flex justify-between">
				<Button variant="outline" onclick={prevStep} disabled={currentStep === 1 || isSubmitting}>
					Previous
				</Button>

				{#if currentStep < totalSteps}
					<Button onclick={nextStep} disabled={isSubmitting}>Next</Button>
				{:else}
					<Button onclick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? 'Submitting...' : 'Submit'}
					</Button>
				{/if}
			</CardFooter>
		{/if}
	</Card>
</div>
