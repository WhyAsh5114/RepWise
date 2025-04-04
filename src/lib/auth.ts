import prisma from './prisma';
import { betterAuth } from 'better-auth';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';

export const auth = betterAuth({
	trustedOrigins: ['http://localhost:5173', PUBLIC_BASE_URL],
	database: prismaAdapter(prisma, {
		provider: 'postgresql'
	}),
	emailAndPassword: {
		enabled: true
	},
	socialProviders: {
		google: {
			clientId: GOOGLE_CLIENT_ID!,
			clientSecret: GOOGLE_CLIENT_SECRET!
		}
	}
});
