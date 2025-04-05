<script lang="ts">
	interface ProfileData {
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
</script>
