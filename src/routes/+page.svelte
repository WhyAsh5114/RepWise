<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		Activity,
		Smartphone,
		Barcode,
		Award,
		Bot,
		ChevronRight,
		Lock,
		Sparkles
	} from 'lucide-svelte';

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	let deferredPrompt: BeforeInstallPromptEvent | null = null;

	onMount(() => {
		const installButton = document.getElementById('installPwa');

		if (installButton) {
			installButton.style.display = 'none';
		}

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;

			if (!installButton) return;
			installButton.style.display = 'flex';

			installButton.addEventListener('click', () => {
				if (!deferredPrompt) return;

				deferredPrompt.prompt();
				deferredPrompt.userChoice.then(() => {
					deferredPrompt = null;
					installButton.style.display = 'none';
				});
			});
		});

		window.addEventListener('appinstalled', () => {
			if (!installButton) return;

			deferredPrompt = null;
			installButton.style.display = 'none';
		});
	});
</script>

<div class="flex min-h-screen flex-col">
	<header
		class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="container flex h-16 items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<div class="rounded-full bg-background p-1">
					<img src="/logo.png" alt="Logo" class="size-10 text-primary" />
				</div>
				<span class="text-xl font-bold">RepWise</span>
			</a>
			<nav class="hidden gap-6 md:flex">
				<a href="#features" class="text-base font-medium hover:text-primary">Features</a>
				<a href="#future" class="text-base font-medium hover:text-primary">Future</a>
			</nav>

			<div class="flex items-center gap-4">
				<div class="h-9 w-[132px]">
					<Button size="sm" id="installPwa" class="w-full">
						<span class="mr-2">Install App</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lucide lucide-download"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="7 10 12 15 17 10"></polyline>
							<line x1="12" y1="15" x2="12" y2="3"></line>
						</svg>
					</Button>
				</div>
			</div>
		</div>
	</header>

	<main class="flex-1">
		<section class="py-16 md:py-24">
			<div class="container">
				<div class="mx-auto max-w-3xl text-center">
					<Badge class="mb-4">AI-Powered Fitness</Badge>
					<h1 class="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
						RepWise - AI-Powered Fitness & Health Companion
					</h1>
					<p class="mb-8 text-lg text-muted-foreground">
						An advanced fitness app integrating real-time pose detection with voice feedback, macro
						tracking with barcode scanning, and AI-powered workout programs. Supports Health
						Connect, WearOS, and features PVP fitness, gamification.
					</p>
					<Button href="/dashboard" size="lg">
						Get Started
						<ChevronRight class="ml-2 h-4 w-4" />
					</Button>
				</div>
			</div>
		</section>

		<section id="features" class="bg-muted/50 py-16">
			<div class="container">
				<h2 class="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
					Key Features
				</h2>

				<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardHeader>
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Activity class="h-6 w-6 text-primary" />
							</div>
							<CardTitle>Pose Detection & Correction</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Get real-time feedback to perfect your form</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Barcode class="h-6 w-6 text-primary" />
							</div>
							<CardTitle>Macro & Nutrition Tracking</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Log food, scan barcodes, and receive AI-based suggestions</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Smartphone class="h-6 w-6 text-primary" />
							</div>
							<CardTitle>WearOS & Health Connect</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Sync data seamlessly across devices</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Award class="h-6 w-6 text-primary" />
							</div>
							<CardTitle>Gamified Workouts</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Compete in PVP fitness challenges</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Bot class="h-6 w-6 text-primary" />
							</div>
							<CardTitle>AI Chatbot & Program Generation</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Personalized plans, insights, and recommendations</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>

		<section id="future" class="py-16">
			<div class="container">
				<h2 class="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">Future Scope</h2>
				<div class="mx-auto grid w-full max-w-3xl gap-8 md:grid-cols-2">
					<Card class="mx-auto max-w-lg">
						<CardHeader>
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Lock class="h-6 w-6 text-primary" />
							</div>
							<CardTitle>Decentralized Health Records</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Secure and private health data management</p>
						</CardContent>
					</Card>
					<Card class="mx-auto max-w-lg">
						<CardHeader>
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Sparkles class="h-6 w-6 text-primary" />
							</div>
							<CardTitle>NFTs for Achievements</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Rewarding milestones with blockchain-based NFTs</p>
						</CardContent>
					</Card>
				</div>
				<div class="mt-16 text-center">
					<h3 class="mb-2 text-2xl font-bold">
						Elevate your fitness with AI-driven insights and gamification!
					</h3>
					<p class="mb-6 text-muted-foreground">#FitnessAI #PoseCorrection #WearOS #HealthTech</p>
				</div>
			</div>
		</section>
	</main>

	<footer class="bg-muted py-8">
		<div class="container">
			<div class="flex flex-col items-center justify-between md:flex-row">
				<div class="mb-4 flex items-center gap-2 md:mb-0">
					<div class="rounded-full bg-background p-1">
						<img src="/logo.png" alt="Logo" class="size-10 text-primary" />
					</div>
					<a href="/" class="font-bold">RepWise</a>
				</div>
				<div class="text-sm text-muted-foreground">© 2025 RepWise. All rights reserved.</div>
			</div>
		</div>
	</footer>
</div>
