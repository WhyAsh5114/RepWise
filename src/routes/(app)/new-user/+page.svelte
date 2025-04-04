<script lang="ts">
    import { Slider } from "$lib/components/ui/slider";
    import * as Select from "$lib/components/ui/select/index.js";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { RadioGroup, RadioGroupItem } from "$lib/components/ui/radio-group";
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { AlertCircle, Check } from "lucide-svelte";
    import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
    import { Progress } from "$lib/components/ui/progress";
    import { Badge } from "$lib/components/ui/badge";
    import { toast } from "svelte-sonner";
  
    // Form state using Svelte 5 runes
    let $fitnessLevel = "";
    let $fitnessGoal = "";
    let $age = null;
    let $weight = null;
    let $height = null;
    let $gender = "";
    let $daysPerWeek = 3;
    let $availableEquipment = [];
    let $injuries = "";
  
    // Available equipment options
    const equipmentOptions = [
      { value: "none", label: "None" },
      { value: "dumbbells", label: "Dumbbells" },
      { value: "barbell", label: "Barbell" },
      { value: "kettlebell", label: "Kettlebell" },
      { value: "resistance_bands", label: "Resistance Bands" },
      { value: "pull_up_bar", label: "Pull-up Bar" },
      { value: "bench", label: "Bench" },
      { value: "full_gym", label: "Full Gym" }
    ];
  
    // Form validation and UI state using Svelte 5 runes
    let $errors = {};
    let $currentStep = 1;
    const totalSteps = 4;
    let $isSubmitting = false;
    let $isSuccess = false;
  
    // Derived state using Svelte 5 syntax
    $effect(() => {
      $progressPercentage = ($currentStep / totalSteps) * 100;
    });
    let $progressPercentage = ($currentStep / totalSteps) * 100;
  
    // Form functions
    function toggleEquipment(item) {
      if ($availableEquipment.includes(item)) {
        $availableEquipment = $availableEquipment.filter(i => i !== item);
      } else {
        $availableEquipment = [...$availableEquipment, item];
      }
    }
  
    function validateCurrentStep() {
      $errors = {};
      let isValid = true;
      
      if ($currentStep === 1) {
        if (!$fitnessLevel) {
          $errors = { ...$errors, fitnessLevel: "Please select your fitness level" };
          isValid = false;
        }
        if (!$fitnessGoal) {
          $errors = { ...$errors, fitnessGoal: "Please select your fitness goal" };
          isValid = false;
        }
      } else if ($currentStep === 2) {
        if (!$age || $age < 16 || $age > 90) {
          $errors = { ...$errors, age: "Age must be between 16 and 90" };
          isValid = false;
        }
        if (!$weight || $weight <= 0) {
          $errors = { ...$errors, weight: "Please enter a valid weight" };
          isValid = false;
        }
        if (!$height || $height <= 0) {
          $errors = { ...$errors, height: "Please enter a valid height" };
          isValid = false;
        }
      } else if ($currentStep === 3) {
        if (!$gender) {
          $errors = { ...$errors, gender: "Please select your gender" };
          isValid = false;
        }
      }
      
      return isValid;
    }
  
    function nextStep() {
      if (validateCurrentStep()) {
        if ($currentStep < totalSteps) {
          $currentStep++;
        }
      }
    }
  
    function prevStep() {
      if ($currentStep > 1) {
        $currentStep--;
      }
    }
  
    // Get form data for submission
    function getFormData() {
      return {
        fitnessLevel: $fitnessLevel,
        fitnessGoal: $fitnessGoal,
        age: $age,
        weight: $weight,
        height: $height,
        gender: $gender,
        daysPerWeek: $daysPerWeek,
        availableEquipment: $availableEquipment,
        injuries: $injuries
      };
    }
  
    async function handleSubmit() {
      if (validateCurrentStep()) {
        $isSubmitting = true;
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log("Form submitted:", getFormData());
          $isSuccess = true;
          toast.success("Your fitness profile has been created!");
        } catch (error) {
          toast.error("There was an error submitting your form");
        } finally {
          $isSubmitting = false;
        }
      }
    }
  </script>
  
  <div class="container max-w-2xl mx-auto py-10 px-4">
    <Card class="shadow-lg">
      <CardHeader>
        <div class="flex justify-between items-center">
          <div>
            <CardTitle class="text-2xl font-bold">Fitness Questionnaire</CardTitle>
            <CardDescription>Create your personalized fitness profile</CardDescription>
          </div>
          <Badge variant="outline" class="text-sm">Step {$currentStep} of {totalSteps}</Badge>
        </div>
        <div class="mt-2">
          <Progress value={$progressPercentage} class="h-2" />
        </div>
      </CardHeader>
  
      <CardContent>
        {#if $isSuccess}
          <div class="py-10 text-center space-y-4">
            <div class="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto flex items-center justify-center">
              <Check class="w-8 h-8 text-green-600" />
            </div>
            <h3 class="text-xl font-medium">Profile Created Successfully!</h3>
            <p class="text-muted-foreground">Your personalized fitness plan is being prepared.</p>
          </div>
        {:else}
          <!-- Step 1: Fitness Level and Goal -->
          {#if $currentStep === 1}
            <div class="space-y-6">
              <div class="space-y-4">
                <h3 class="text-lg font-medium">Fitness Level & Goals</h3>
                
                <div class="space-y-2">
                  <Label for="fitnessLevel">Fitness Level</Label>
                  <RadioGroup class="grid grid-cols-3 gap-2">
                    <div>
                      <RadioGroupItem 
                        id="beginner" 
                        value="beginner" 
                        bind:checked={$fitnessLevel === "beginner"}
                        on:change={() => $fitnessLevel = "beginner"}
                        class="peer sr-only"
                      />
                      <Label
                        for="beginner"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <span>Beginner</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem 
                        id="intermediate" 
                        value="intermediate" 
                        bind:checked={$fitnessLevel === "intermediate"}
                        on:change={() => $fitnessLevel = "intermediate"}
                        class="peer sr-only"
                      />
                      <Label
                        for="intermediate"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <span>Intermediate</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem 
                        id="advanced" 
                        value="advanced" 
                        bind:checked={$fitnessLevel === "advanced"}
                        on:change={() => $fitnessLevel = "advanced"}
                        class="peer sr-only"
                      />
                      <Label
                        for="advanced"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <span>Advanced</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  {#if $errors.fitnessLevel}
                    <p class="text-sm text-red-500">{$errors.fitnessLevel}</p>
                  {/if}
                </div>
  
                <div class="space-y-2 pt-4">
                  <Label for="fitnessGoal">Fitness Goal</Label>
                  <Select.Root type="single" onValueChange={(value) => ($fitnessGoal = value)}>
                    <Select.Trigger id="fitnessGoal" class="w-full">
                      <span slot="placeholder">Select your primary goal</span>
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
                  {#if $errors.fitnessGoal}
                    <p class="text-sm text-red-500">{$errors.fitnessGoal}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
  
          <!-- Step 2: Physical Attributes -->
          {#if $currentStep === 2}
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
                    bind:value={$age} 
                  />
                  {#if $errors.age}
                    <p class="text-sm text-red-500">{$errors.age}</p>
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
                    bind:value={$weight} 
                  />
                  {#if $errors.weight}
                    <p class="text-sm text-red-500">{$errors.weight}</p>
                  {/if}
                </div>
  
                <div class="space-y-2">
                  <Label for="height">Height (cm)</Label>
                  <Input 
                    id="height" 
                    type="number" 
                    min="1" 
                    placeholder="Enter your height in cm"
                    bind:value={$height} 
                  />
                  {#if $errors.height}
                    <p class="text-sm text-red-500">{$errors.height}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
  
          <!-- Step 3: Gender and Training Frequency -->
          {#if $currentStep === 3}
            <div class="space-y-6">
              <div class="space-y-4">
                <h3 class="text-lg font-medium">Gender & Training Schedule</h3>
                
                <div class="space-y-2">
                  <Label for="gender">Gender</Label>
                  <RadioGroup class="grid grid-cols-3 gap-2">
                    <div>
                      <RadioGroupItem 
                        id="male" 
                        value="male" 
                        bind:checked={$gender === "male"}
                        on:change={() => $gender = "male"}
                        class="peer sr-only"
                      />
                      <Label
                        for="male"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <span>Male</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem 
                        id="female" 
                        value="female" 
                        bind:checked={$gender === "female"}
                        on:change={() => $gender = "female"}
                        class="peer sr-only"
                      />
                      <Label
                        for="female"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <span>Female</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem 
                        id="other" 
                        value="other" 
                        bind:checked={$gender === "other"}
                        on:change={() => $gender = "other"}
                        class="peer sr-only"
                      />
                      <Label
                        for="other"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <span>Other</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  {#if $errors.gender}
                    <p class="text-sm text-red-500">{$errors.gender}</p>
                  {/if}
                </div>
  
                <div class="space-y-2 pt-4">
                  <Label for="daysPerWeek">Days Per Week ({$daysPerWeek})</Label>
                  <Slider 
                    id="daysPerWeek" 
                    min={1} 
                    max={7} 
                    step={1} 
                    value={[$daysPerWeek]} 
                    onValueChange={(vals) => $daysPerWeek = vals[0]} 
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
  
          <!-- Step 4: Equipment and Limitations -->
          {#if $currentStep === 4}
            <div class="space-y-6">
              <div class="space-y-4">
                <h3 class="text-lg font-medium">Equipment & Limitations</h3>
                
                <div class="space-y-2">
                  <Label>Available Equipment</Label>
                  <div class="grid grid-cols-2 gap-2">
                    {#each equipmentOptions as option}
                      <Button 
                        type="button" 
                        variant={$availableEquipment.includes(option.value) ? "default" : "outline"} 
                        class="justify-start"
                        on:click={() => toggleEquipment(option.value)}
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
                    bind:value={$injuries}
                    rows={4}
                  />
                </div>
  
                <Alert variant="default" class="bg-amber-50 border-amber-200">
                  <AlertCircle class="h-4 w-4 text-amber-500" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    This information will be used to customize your workout plan. If you have severe injuries, 
                    please consult with a healthcare professional before starting any exercise program.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          {/if}
        {/if}
      </CardContent>
  
      {#if !$isSuccess}
        <CardFooter class="flex justify-between">
          <Button variant="outline" on:click={prevStep} disabled={$currentStep === 1 || $isSubmitting}>
            Previous
          </Button>
          
          {#if $currentStep < totalSteps}
            <Button on:click={nextStep} disabled={$isSubmitting}>
              Next
            </Button>
          {:else}
            <Button on:click={handleSubmit} disabled={$isSubmitting}>
              {$isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          {/if}
        </CardFooter>
      {/if}
    </Card>
  </div>